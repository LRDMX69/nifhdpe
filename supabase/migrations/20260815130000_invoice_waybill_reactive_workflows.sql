-- NIFHDPE invoice and waybill reactive workflow hardening.
-- Additive and policy-neutral: company tax rates and commercial policies remain inputs.

CREATE TABLE IF NOT EXISTS public.client_document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  document_family text NOT NULL CHECK (document_family IN ('invoice','sales_order')),
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  base_number integer NOT NULL CHECK (base_number > 0),
  base_reference text NOT NULL,
  suffix_index integer NOT NULL DEFAULT 0 CHECK (suffix_index >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, client_id, document_family, year)
);

ALTER TABLE public.client_document_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view client document sequences" ON public.client_document_sequences;
CREATE POLICY "Members can view client document sequences" ON public.client_document_sequences FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
DROP POLICY IF EXISTS "Authorized users manage client document sequences" ON public.client_document_sequences;
CREATE POLICY "Authorized users manage client document sequences" ON public.client_document_sequences FOR ALL
  USING (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role)
    OR is_maintenance_admin(auth.uid())
  )
  WITH CHECK (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role)
    OR is_maintenance_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.alpha_document_suffix(_value integer)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_value integer := _value;
  v_result text := '';
BEGIN
  IF v_value IS NULL OR v_value <= 0 THEN RETURN ''; END IF;
  WHILE v_value > 0 LOOP
    v_value := v_value - 1;
    v_result := chr(65 + mod(v_value, 26)) || v_result;
    v_value := floor(v_value / 26.0)::integer;
  END LOOP;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_client_document_number(
  _org_id uuid,
  _client_id uuid,
  _document_family text
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_sequence public.client_document_sequences;
  v_global_number text;
  v_base_number integer;
  v_suffix_index integer;

BEGIN
  IF _org_id IS NULL OR _client_id IS NULL THEN
    RAISE EXCEPTION 'Organization and client are required for client-aware numbering';
  END IF;
  IF _document_family NOT IN ('invoice', 'sales_order') THEN
    RAISE EXCEPTION 'Unsupported client document family: %', _document_family;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND organization_id = _org_id) THEN
    RAISE EXCEPTION 'Client not found in organization';
  END IF;

  SELECT * INTO v_sequence
  FROM public.client_document_sequences
  WHERE organization_id = _org_id
    AND client_id = _client_id
    AND document_family = _document_family
    AND year = v_year
  FOR UPDATE;

  IF FOUND THEN
    v_suffix_index := v_sequence.suffix_index + 1;
    UPDATE public.client_document_sequences
    SET suffix_index = v_suffix_index, updated_at = now()
    WHERE id = v_sequence.id;
    RETURN v_sequence.base_reference || public.alpha_document_suffix(v_suffix_index + 1);
  END IF;

  v_global_number := public.next_doc_number(_org_id, CASE WHEN _document_family = 'invoice' THEN 'invoices' ELSE 'sales_orders' END);
  v_base_number := split_part(v_global_number, '/', 3)::integer;
  INSERT INTO public.client_document_sequences (organization_id, client_id, document_family, year, base_number, base_reference, suffix_index)
  VALUES (_org_id, _client_id, _document_family, v_year, v_base_number, v_global_number, 0);
  RETURN v_global_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_client_document_number(uuid, uuid, text) TO authenticated;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_reference text,
  ADD COLUMN IF NOT EXISTS client_name_snapshot text,
  ADD COLUMN IF NOT EXISTS client_tin_snapshot text,
  ADD COLUMN IF NOT EXISTS client_address_snapshot text,
  ADD COLUMN IF NOT EXISTS client_phone_snapshot text,
  ADD COLUMN IF NOT EXISTS client_email_snapshot text,
  ADD COLUMN IF NOT EXISTS contact_person_snapshot text,
  ADD COLUMN IF NOT EXISTS site_reference text,
  ADD COLUMN IF NOT EXISTS delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_contact text,
  ADD COLUMN IF NOT EXISTS delivery_state text,
  ADD COLUMN IF NOT EXISTS delivery_lga text,
  ADD COLUMN IF NOT EXISTS taxable_amount numeric NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  ADD COLUMN IF NOT EXISTS net_amount numeric NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  ADD COLUMN IF NOT EXISTS free_trade_zone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'each',
  ADD COLUMN IF NOT EXISTS source_order_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_client_date_idx ON public.invoices(organization_id, client_id, invoice_date);
CREATE INDEX IF NOT EXISTS invoices_delivery_idx ON public.invoices(organization_id, delivery_id);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_idempotency_key_idx ON public.invoices(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_org_document_number_idx ON public.invoices(organization_id, document_number) WHERE document_number IS NOT NULL;

-- Preserve historical payment state before the normalizer becomes authoritative.
UPDATE public.invoices
SET amount_paid = round(greatest(0, coalesce(total_amount, 0) - coalesce(balance_due, total_amount, 0)), 2),
    taxable_amount = round(greatest(0, coalesce(subtotal, 0) - coalesce(discount_amount, 0) + coalesce(overhead_amount, 0) + coalesce(transportation_cost, 0)), 2),
    net_amount = round(greatest(0, coalesce(total_amount, 0) - coalesce(withholding_tax_amount, 0)), 2)
WHERE amount_paid = 0 OR taxable_amount = 0 OR net_amount = 0;

CREATE OR REPLACE FUNCTION public.normalize_invoice_financial_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_is_draft boolean := TG_OP = 'INSERT' AND COALESCE(NEW.status, 'draft') = 'draft';
BEGIN
  IF coalesce(NEW.subtotal, 0) < 0 OR coalesce(NEW.discount_amount, 0) < 0 OR coalesce(NEW.overhead_amount, 0) < 0 OR coalesce(NEW.transportation_cost, 0) < 0 OR coalesce(NEW.tax_rate, 0) < 0 OR coalesce(NEW.withholding_tax_rate, 0) < 0 OR coalesce(NEW.amount_paid, 0) < 0 THEN
    RAISE EXCEPTION 'Invoice financial values cannot be negative';
  END IF;
  NEW.subtotal := round(coalesce(NEW.subtotal, 0), 2);
  NEW.discount_amount := round(coalesce(NEW.discount_amount, 0), 2);
  NEW.overhead_amount := round(coalesce(NEW.overhead_amount, 0), 2);
  NEW.transportation_cost := round(coalesce(NEW.transportation_cost, 0), 2);
  IF NEW.discount_amount > NEW.subtotal THEN RAISE EXCEPTION 'Invoice discount cannot exceed subtotal'; END IF;
  NEW.taxable_amount := round(greatest(0, NEW.subtotal - NEW.discount_amount + NEW.overhead_amount + NEW.transportation_cost), 2);
  NEW.tax_amount := round(NEW.taxable_amount * coalesce(NEW.tax_rate, 0) / 100, 2);
  NEW.total_amount := round(NEW.taxable_amount + NEW.tax_amount, 2);
  NEW.withholding_tax_amount := round(NEW.taxable_amount * coalesce(NEW.withholding_tax_rate, 0) / 100, 2);
  NEW.net_amount := round(greatest(0, NEW.total_amount - NEW.withholding_tax_amount), 2);
  NEW.amount_paid := round(coalesce(NEW.amount_paid, 0), 2);
  IF NEW.amount_paid > NEW.net_amount THEN RAISE EXCEPTION 'Invoice payments cannot exceed net amount due'; END IF;
  NEW.balance_due := round(greatest(0, NEW.net_amount - NEW.amount_paid), 2);
  IF NOT v_is_draft AND COALESCE(NEW.status, '') <> 'cancelled' THEN
    NEW.status := CASE WHEN NEW.balance_due = 0 THEN 'paid' WHEN NEW.amount_paid > 0 THEN 'partially_paid' ELSE 'unpaid' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_invoice_financial_fields_trigger ON public.invoices;
CREATE TRIGGER normalize_invoice_financial_fields_trigger
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.normalize_invoice_financial_fields();

CREATE OR REPLACE FUNCTION public.assign_invoice_client_document_number()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.document_number IS NULL OR btrim(NEW.document_number) = '' THEN
    IF NEW.client_id IS NOT NULL THEN
      NEW.document_number := public.next_client_document_number(NEW.organization_id, NEW.client_id, 'invoice');
    ELSE
      NEW.document_number := public.next_doc_number(NEW.organization_id, 'invoices');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_invoices_doc_num ON public.invoices;
CREATE TRIGGER tr_invoices_doc_num BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_client_document_number();

CREATE OR REPLACE FUNCTION public.assign_sales_order_client_document_number()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := public.next_client_document_number(NEW.organization_id, NEW.client_id, 'sales_order');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sales_orders_client_doc_num ON public.sales_orders;
CREATE TRIGGER tr_sales_orders_client_doc_num BEFORE INSERT ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.assign_sales_order_client_document_number();

CREATE OR REPLACE FUNCTION public.create_invoice_with_metadata(
  _org_id uuid,
  _payload jsonb,
  _idempotency_key text DEFAULT NULL
)
RETURNS public.invoices
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_invoice public.invoices;
  v_client public.clients;
  v_order public.sales_orders;
  v_client_po public.client_purchase_orders;
  v_item jsonb;
  v_number text;
  v_subtotal numeric := 0;
  v_discount numeric := round(greatest(0, coalesce((_payload->>'discount_amount')::numeric, 0)), 2);
  v_overhead numeric := round(greatest(0, coalesce((_payload->>'overhead_amount')::numeric, 0)), 2);
  v_transport numeric := round(greatest(0, coalesce((_payload->>'transportation_cost')::numeric, 0)), 2);
  v_tax_rate numeric := round(greatest(0, coalesce((_payload->>'tax_rate')::numeric, 0)), 4);
  v_wht_rate numeric := round(greatest(0, coalesce((_payload->>'withholding_tax_rate')::numeric, 0)), 4);
  v_taxable numeric;
  v_tax numeric;
  v_wht numeric;
  v_total numeric;
  v_net numeric;
  v_status text := coalesce(nullif(trim(_payload->>'status'), ''), 'draft');
  v_items jsonb := coalesce(_payload->'items', '[]'::jsonb);
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to create invoice';
  END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO v_invoice FROM public.invoices WHERE organization_id = _org_id AND idempotency_key = _idempotency_key FOR UPDATE;
    IF FOUND THEN RETURN v_invoice; END IF;
  END IF;
  IF (_payload->>'client_id') IS NULL OR btrim(_payload->>'client_id') = '' THEN RAISE EXCEPTION 'Client is required'; END IF;
  SELECT * INTO v_client FROM public.clients WHERE id = (_payload->>'client_id')::uuid AND organization_id = _org_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client not found in organization'; END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'At least one invoice line is required'; END IF;
  IF v_status NOT IN ('draft','unpaid','partially_paid','paid') THEN RAISE EXCEPTION 'Unsupported invoice status: %', v_status; END IF;
  IF v_discount < 0 OR v_overhead < 0 OR v_transport < 0 OR v_tax_rate < 0 OR v_wht_rate < 0 THEN RAISE EXCEPTION 'Invoice amounts and rates cannot be negative'; END IF;

  IF (_payload->>'sales_order_id') IS NOT NULL AND btrim(_payload->>'sales_order_id') <> '' THEN
    SELECT * INTO v_order FROM public.sales_orders WHERE id = (_payload->>'sales_order_id')::uuid AND organization_id = _org_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sales order not found in organization'; END IF;
    IF v_order.client_id <> v_client.id THEN RAISE EXCEPTION 'Sales order and client do not match'; END IF;
  END IF;
  IF (_payload->>'client_po_id') IS NOT NULL AND btrim(_payload->>'client_po_id') <> '' THEN
    SELECT * INTO v_client_po FROM public.client_purchase_orders WHERE id = (_payload->>'client_po_id')::uuid AND organization_id = _org_id AND client_id = v_client.id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Client purchase order not found for selected client'; END IF;
  END IF;
  IF (_payload->>'bank_account_id') IS NOT NULL AND btrim(_payload->>'bank_account_id') <> '' AND NOT EXISTS (SELECT 1 FROM public.finance_accounts WHERE id = (_payload->>'bank_account_id')::uuid AND organization_id = _org_id AND is_active) THEN
    RAISE EXCEPTION 'Invoice bank account not found or inactive in organization';
  END IF;
  IF (_payload->>'delivery_id') IS NOT NULL AND btrim(_payload->>'delivery_id') <> '' AND NOT EXISTS (SELECT 1 FROM public.deliveries WHERE id = (_payload->>'delivery_id')::uuid AND organization_id = _org_id AND (client_id IS NULL OR client_id = v_client.id)) THEN
    RAISE EXCEPTION 'Delivery not found for selected client';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    IF coalesce(trim(v_item->>'description'), '') = '' THEN RAISE EXCEPTION 'Every invoice line needs a description'; END IF;
    IF coalesce((v_item->>'quantity')::numeric, 0) <= 0 THEN RAISE EXCEPTION 'Invoice line quantities must be greater than zero'; END IF;
    IF coalesce((v_item->>'unit_price')::numeric, 0) < 0 THEN RAISE EXCEPTION 'Invoice line prices cannot be negative'; END IF;
    v_subtotal := v_subtotal + round((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric - greatest(0, coalesce((v_item->>'discount_amount')::numeric, 0)), 2);
  END LOOP;
  v_subtotal := round(v_subtotal, 2);
  IF v_discount > v_subtotal THEN RAISE EXCEPTION 'Invoice discount cannot exceed line subtotal'; END IF;
  v_taxable := round(greatest(0, v_subtotal - v_discount + v_overhead + v_transport), 2);
  v_tax := round(v_taxable * v_tax_rate / 100, 2);
  v_wht := round(v_taxable * v_wht_rate / 100, 2);
  v_total := round(v_taxable + v_tax, 2);
  v_net := round(greatest(0, v_total - v_wht), 2);
  v_number := public.next_client_document_number(_org_id, v_client.id, 'invoice');

  INSERT INTO public.invoices (
    organization_id, document_number, client_id, quotation_id, sales_order_id, project_id, client_po_id, delivery_id, bank_account_id,
    invoice_date, due_date, customer_reference, client_name_snapshot, client_tin_snapshot, client_address_snapshot,
    client_phone_snapshot, client_email_snapshot, contact_person_snapshot, site_reference, delivery_address,
    delivery_contact, delivery_state, delivery_lga, invoice_kind, currency, subtotal, discount_amount, overhead_amount,
    transportation_cost, taxable_amount, tax_rate, tax_amount, withholding_tax_rate, withholding_tax_amount, total_amount,
    net_amount, amount_paid, balance_due, free_trade_zone, payment_terms, terms_and_conditions, notes, source_metadata,
    idempotency_key, status, created_by
  ) VALUES (
    _org_id, v_number, v_client.id, NULLIF(_payload->>'quotation_id','')::uuid, NULLIF(_payload->>'sales_order_id','')::uuid, NULLIF(_payload->>'project_id','')::uuid, NULLIF(_payload->>'client_po_id','')::uuid, NULLIF(_payload->>'delivery_id','')::uuid, NULLIF(_payload->>'bank_account_id','')::uuid,
    coalesce(NULLIF(_payload->>'invoice_date','')::date, current_date), NULLIF(_payload->>'due_date','')::date, NULLIF(trim(_payload->>'customer_reference'),''), v_client.name, NULLIF(v_client.tax_identification_number,''), v_client.address,
    v_client.phone, v_client.email, v_client.contact_person, NULLIF(trim(_payload->>'site_reference'),''), NULLIF(trim(_payload->>'delivery_address'),''), NULLIF(trim(_payload->>'delivery_contact'),''), NULLIF(trim(_payload->>'delivery_state'),''), NULLIF(trim(_payload->>'delivery_lga'),''),
    coalesce(NULLIF(_payload->>'invoice_kind',''),'standard'), coalesce(NULLIF(_payload->>'currency',''),'NGN'), v_subtotal, v_discount, v_overhead, v_transport, v_taxable, v_tax_rate, v_tax, v_wht_rate, v_wht, v_total, v_net, 0, v_net, coalesce((_payload->>'free_trade_zone')::boolean, false), NULLIF(trim(_payload->>'payment_terms'),''), NULLIF(trim(_payload->>'terms_and_conditions'),''), NULLIF(trim(_payload->>'notes'),''), coalesce(_payload->'source_metadata','{}'::jsonb), _idempotency_key, v_status, auth.uid()
  ) RETURNING * INTO v_invoice;

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit, unit_price, total_price, item_type, product_specification_id, discount_amount, tax_amount, cost_code, source_order_item_id)
  SELECT v_invoice.id, trim(value->>'description'), (value->>'quantity')::numeric, coalesce(NULLIF(value->>'unit',''),'each'), (value->>'unit_price')::numeric,
    round((value->>'quantity')::numeric * (value->>'unit_price')::numeric - greatest(0, coalesce((value->>'discount_amount')::numeric,0)), 2), coalesce(NULLIF(value->>'item_type',''),'other'), NULLIF(value->>'product_specification_id','')::uuid,
    greatest(0, coalesce((value->>'discount_amount')::numeric,0)), greatest(0, coalesce((value->>'tax_amount')::numeric,0)), NULLIF(trim(value->>'cost_code'),''), NULLIF(value->>'source_order_item_id','')::uuid
  FROM jsonb_array_elements(v_items);

  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'invoice_created', 'invoice', v_invoice.id, to_jsonb(v_invoice), 'create_invoice_with_metadata');
  RETURN v_invoice;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_metadata(uuid, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_sales_order_from_quotation(_org_id uuid, _quotation_id uuid, _notes text DEFAULT NULL)
RETURNS public.sales_orders
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  q public.quotations;
  result public.sales_orders;
  order_no text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to create a sales order'; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = _quotation_id AND organization_id = _org_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quotation not found'; END IF;
  IF q.status <> 'accepted' THEN RAISE EXCEPTION 'Only an accepted quotation can become a sales order'; END IF;
  SELECT * INTO result FROM public.sales_orders WHERE organization_id = _org_id AND quotation_id = _quotation_id AND status <> 'cancelled' FOR UPDATE;
  IF FOUND THEN RETURN result; END IF;
  order_no := public.next_client_document_number(_org_id, q.client_id, 'sales_order');
  INSERT INTO public.sales_orders (organization_id, order_number, client_id, opportunity_id, quotation_id, project_id, status, currency, subtotal, discount_amount, tax_amount, total_amount, notes, created_by)
  VALUES (_org_id, order_no, q.client_id, q.opportunity_id, q.id, NULL, 'draft', coalesce(q.currency,'NGN'), coalesce(q.subtotal,0), coalesce(q.discount_amount,0), coalesce(q.tax_amount,0), coalesce(q.total_amount,0), _notes, auth.uid()) RETURNING * INTO result;
  INSERT INTO public.sales_order_items (sales_order_id, product_specification_id, description, quantity, unit, unit_price, total_price, configurable_attributes)
  SELECT result.id, qi.product_specification_id, qi.description, qi.quantity, 'each', qi.unit_price, qi.total_price, jsonb_build_object('item_type', qi.item_type, 'source_quotation_item_id', qi.id)
  FROM public.quotation_items qi WHERE qi.quotation_id = q.id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_quotation', 'sales_order', result.id, jsonb_build_object('quotation_id', q.id, 'quotation_number', q.quotation_number, 'order_number', result.order_number), 'create_sales_order_from_quotation');
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_sales_order_from_quotation(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_invoice_from_sales_order(_org_id uuid, _order_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_order public.sales_orders;
  v_existing public.invoices;
  v_payload jsonb;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to create invoice'; END IF;
  SELECT * INTO v_order FROM public.sales_orders WHERE id = _order_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sales order not found'; END IF;
  IF v_order.status NOT IN ('confirmed','partially_fulfilled','fulfilled') THEN RAISE EXCEPTION 'Order is not ready for invoicing'; END IF;
  SELECT * INTO v_existing FROM public.invoices WHERE organization_id = _org_id AND sales_order_id = _order_id AND status <> 'cancelled' FOR UPDATE;
  IF FOUND THEN RETURN v_existing; END IF;
  SELECT jsonb_build_object(
    'client_id', v_order.client_id,
    'quotation_id', v_order.quotation_id,
    'sales_order_id', v_order.id,
    'project_id', v_order.project_id,
    'invoice_date', current_date,
    'currency', v_order.currency,
    'discount_amount', v_order.discount_amount,
    'tax_rate', CASE WHEN greatest(0, v_order.subtotal - v_order.discount_amount) > 0 THEN round(v_order.tax_amount / greatest(0, v_order.subtotal - v_order.discount_amount) * 100, 4) ELSE 0 END,
    'notes', v_order.notes,
    'status', 'unpaid',
    'source_metadata', jsonb_build_object('source', 'sales_order', 'sales_order_number', v_order.order_number),
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object('description', soi.description, 'quantity', soi.quantity, 'unit', soi.unit, 'unit_price', soi.unit_price, 'item_type', coalesce(soi.configurable_attributes->>'item_type','other'), 'product_specification_id', soi.product_specification_id, 'source_order_item_id', soi.id)) FROM public.sales_order_items soi WHERE soi.sales_order_id = v_order.id), '[]'::jsonb)
  ) INTO v_payload;
  RETURN public.create_invoice_with_metadata(_org_id, v_payload, 'sales-order:' || v_order.id::text);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_sales_order(uuid, uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.waybills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_number text NOT NULL,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  waybill_date date NOT NULL DEFAULT current_date,
  driver text NOT NULL,
  vehicle text,
  destination text NOT NULL,
  destination_state text,
  site_name text,
  project_name text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  issued_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','printed','reprinted','generation_failed','cancelled')),
  generated_at timestamptz,
  printed_at timestamptz,
  last_printed_at timestamptz,
  print_count integer NOT NULL DEFAULT 0 CHECK (print_count >= 0),
  last_error text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, document_number)
);

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS waybill_id uuid REFERENCES public.waybills(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS waybills_idempotency_key_idx ON public.waybills(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS waybills_org_date_idx ON public.waybills(organization_id, waybill_date DESC);
CREATE INDEX IF NOT EXISTS waybills_delivery_idx ON public.waybills(organization_id, delivery_id);
CREATE INDEX IF NOT EXISTS deliveries_waybill_idx ON public.deliveries(organization_id, waybill_id);

ALTER TABLE public.waybills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view waybills" ON public.waybills;
CREATE POLICY "Members can view waybills" ON public.waybills FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
DROP POLICY IF EXISTS "Logistics can issue waybills" ON public.waybills;
CREATE POLICY "Logistics can issue waybills" ON public.waybills FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role) OR is_maintenance_admin(auth.uid()));
DROP POLICY IF EXISTS "Logistics can update waybill print state" ON public.waybills;
CREATE POLICY "Logistics can update waybill print state" ON public.waybills FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role) OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.issue_waybill(
  _org_id uuid,
  _payload jsonb,
  _delivery_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS public.waybills
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_waybill public.waybills;
  v_delivery public.deliveries;
  v_client_id uuid := NULLIF(_payload->>'client_id','')::uuid;
  v_project_id uuid := NULLIF(_payload->>'project_id','')::uuid;
  v_order_id uuid := NULLIF(_payload->>'sales_order_id','')::uuid;
  v_items jsonb := coalesce(_payload->'items','[]'::jsonb);
  v_number text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'warehouse') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to issue waybill'; END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO v_waybill FROM public.waybills WHERE organization_id = _org_id AND idempotency_key = _idempotency_key FOR UPDATE;
    IF FOUND THEN RETURN v_waybill; END IF;
  END IF;
  IF _delivery_id IS NOT NULL THEN
    SELECT * INTO v_delivery FROM public.deliveries WHERE id = _delivery_id AND organization_id = _org_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found in organization'; END IF;
    v_client_id := coalesce(v_delivery.client_id, v_client_id);
    v_project_id := coalesce(v_delivery.project_id, v_project_id);
    v_order_id := coalesce(v_delivery.sales_order_id, v_order_id);
  END IF;
  IF coalesce(trim(_payload->>'driver'),'') = '' THEN RAISE EXCEPTION 'Driver name is required'; END IF;
  IF coalesce(trim(_payload->>'destination'),'') = '' THEN RAISE EXCEPTION 'Destination is required'; END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'At least one waybill item is required'; END IF;
  IF v_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Waybill client not found in organization'; END IF;
  IF v_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sales_orders WHERE id = v_order_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Waybill sales order not found in organization'; END IF;
  IF v_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Waybill project not found in organization'; END IF;
  v_number := public.next_doc_number(_org_id, 'waybills');
  INSERT INTO public.waybills (organization_id, document_number, delivery_id, sales_order_id, client_id, project_id, waybill_date, driver, vehicle, destination, destination_state, site_name, project_name, items, notes, issued_by, idempotency_key)
  VALUES (_org_id, v_number, _delivery_id, v_order_id, v_client_id, v_project_id, coalesce(NULLIF(_payload->>'date','')::date,current_date), trim(_payload->>'driver'), NULLIF(trim(_payload->>'vehicle'),''), trim(_payload->>'destination'), NULLIF(trim(_payload->>'destination_state'),''), NULLIF(trim(_payload->>'site_name'),''), NULLIF(trim(_payload->>'project_name'),''), v_items, NULLIF(trim(_payload->>'notes'),''), auth.uid(), _idempotency_key)
  RETURNING * INTO v_waybill;
  IF _delivery_id IS NOT NULL THEN
    UPDATE public.deliveries SET document_number = v_number, waybill_id = v_waybill.id WHERE id = _delivery_id AND organization_id = _org_id;
  END IF;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'waybill_issued', 'waybill', v_waybill.id, to_jsonb(v_waybill), 'issue_waybill');
  RETURN v_waybill;
END;
$$;
GRANT EXECUTE ON FUNCTION public.issue_waybill(uuid, jsonb, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_waybill_printed(_org_id uuid, _waybill_id uuid, _rendered_at timestamptz DEFAULT now())
RETURNS public.waybills
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_waybill public.waybills; v_result public.waybills;
BEGIN
  SELECT * INTO v_waybill FROM public.waybills WHERE id = _waybill_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Waybill not found in organization'; END IF;
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'warehouse') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to mark waybill printed'; END IF;
  UPDATE public.waybills
  SET status = CASE WHEN print_count = 0 THEN 'printed' ELSE 'reprinted' END,
      generated_at = coalesce(generated_at, _rendered_at),
      printed_at = coalesce(printed_at, _rendered_at),
      last_printed_at = _rendered_at,
      print_count = print_count + 1,
      last_error = NULL,
      updated_at = now()
  WHERE id = _waybill_id AND organization_id = _org_id
  RETURNING * INTO v_result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), CASE WHEN v_waybill.print_count = 0 THEN 'waybill_printed' ELSE 'waybill_reprinted' END, 'waybill', _waybill_id, to_jsonb(v_result), 'mark_waybill_printed');
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_waybill_printed(uuid, uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_waybill_generation_failed(_org_id uuid, _waybill_id uuid, _error text)
RETURNS public.waybills
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result public.waybills;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'warehouse') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to update waybill'; END IF;
  UPDATE public.waybills SET status = 'generation_failed', last_error = NULLIF(trim(_error),''), updated_at = now() WHERE id = _waybill_id AND organization_id = _org_id RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Waybill not found in organization'; END IF;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'waybill_generation_failed', 'waybill', _waybill_id, jsonb_build_object('error', _error), 'mark_waybill_generation_failed');
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_waybill_generation_failed(uuid, uuid, text) TO authenticated;

ALTER TABLE public.waybills REPLICA IDENTITY FULL;


CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  _org_id uuid,
  _invoice_id uuid,
  _amount numeric,
  _payment_method text DEFAULT NULL,
  _reference_number text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _payment_date date DEFAULT current_date
)
RETURNS public.receipts
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_invoice public.invoices;
  v_receipt public.receipts;
  v_previous_paid numeric;
  v_new_paid numeric;
  v_receipt_number text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to record payment'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be greater than zero'; END IF;
  SELECT * INTO v_invoice FROM public.invoices WHERE id = _invoice_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found in organization'; END IF;
  IF coalesce(v_invoice.status, '') = 'cancelled' THEN RAISE EXCEPTION 'Cancelled invoices cannot receive payments'; END IF;
  IF round(_amount, 2) > round(coalesce(v_invoice.balance_due, v_invoice.net_amount, v_invoice.total_amount, 0), 2) THEN RAISE EXCEPTION 'Payment exceeds outstanding balance'; END IF;
  v_previous_paid := round(coalesce(v_invoice.amount_paid, coalesce(v_invoice.total_amount, 0) - coalesce(v_invoice.balance_due, v_invoice.total_amount, 0)), 2);
  v_new_paid := round(v_previous_paid + _amount, 2);
  v_receipt_number := public.next_doc_number(_org_id, 'receipts');
  INSERT INTO public.receipts (organization_id, document_number, invoice_id, client_id, amount_received, payment_method, reference_number, notes, received_by, payment_date)
  VALUES (_org_id, v_receipt_number, v_invoice.id, v_invoice.client_id, round(_amount, 2), NULLIF(trim(_payment_method), ''), NULLIF(trim(_reference_number), ''), NULLIF(trim(_notes), ''), auth.uid(), coalesce(_payment_date, current_date))
  RETURNING * INTO v_receipt;
  UPDATE public.invoices
  SET amount_paid = v_new_paid,
      balance_due = round(greatest(0, coalesce(v_invoice.net_amount, v_invoice.total_amount, 0) - v_new_paid), 2),
      status = CASE WHEN round(greatest(0, coalesce(v_invoice.net_amount, v_invoice.total_amount, 0) - v_new_paid), 2) = 0 THEN 'paid' WHEN v_new_paid > 0 THEN 'partially_paid' ELSE 'unpaid' END
  WHERE id = v_invoice.id AND organization_id = _org_id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
  VALUES (_org_id, auth.uid(), 'payment_recorded', 'invoice', v_invoice.id, jsonb_build_object('amount_paid', v_previous_paid, 'balance_due', v_invoice.balance_due), jsonb_build_object('receipt_id', v_receipt.id, 'amount', round(_amount, 2), 'amount_paid', v_new_paid, 'balance_due', round(greatest(0, coalesce(v_invoice.net_amount, v_invoice.total_amount, 0) - v_new_paid), 2)), 'record_invoice_payment');
  RETURN v_receipt;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, uuid, numeric, text, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  _org_id uuid,
  _invoice_id uuid,
  _amount numeric,
  _payment_method text,
  _reference_number text,
  _notes text,
  _payment_date date,
  _bank_account_id uuid
)
RETURNS public.receipts
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_receipt public.receipts;
BEGIN
  IF _bank_account_id IS NULL THEN RAISE EXCEPTION 'A receiving bank or cash account is required for payment traceability'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_accounts WHERE id = _bank_account_id AND organization_id = _org_id AND is_active) THEN RAISE EXCEPTION 'Bank or cash account not found or inactive in organization'; END IF;
  v_receipt := public.record_invoice_payment(_org_id, _invoice_id, _amount, _payment_method, _reference_number, _notes, _payment_date);
  UPDATE public.receipts SET bank_account_id = _bank_account_id WHERE id = v_receipt.id AND organization_id = _org_id RETURNING * INTO v_receipt;
  RETURN v_receipt;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, uuid, numeric, text, text, text, date, uuid) TO authenticated;
