-- NIFHDPE business-flow autonomy hardening.
-- Safe automation only: copy existing approved data, create linked records,
-- calculate derived values, and preserve human acceptance/approval decisions.

ALTER TABLE public.client_document_sequences
  DROP CONSTRAINT IF EXISTS client_document_sequences_document_family_check;
ALTER TABLE public.client_document_sequences
  ADD CONSTRAINT client_document_sequences_document_family_check
  CHECK (document_family IN ('invoice', 'sales_order', 'proforma'));

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
  v_doc_type text;
BEGIN
  IF _org_id IS NULL OR _client_id IS NULL THEN
    RAISE EXCEPTION 'Organization and client are required for client-aware numbering';
  END IF;
  IF _document_family NOT IN ('invoice', 'sales_order', 'proforma') THEN
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
  v_doc_type := CASE _document_family
    WHEN 'invoice' THEN 'invoices'
    WHEN 'sales_order' THEN 'sales_orders'
    ELSE 'proforma_invoices'
  END;
  v_global_number := public.next_doc_number(_org_id, v_doc_type);
  v_base_number := split_part(v_global_number, '/', 3)::integer;
  INSERT INTO public.client_document_sequences (organization_id, client_id, document_family, year, base_number, base_reference, suffix_index)
  VALUES (_org_id, _client_id, _document_family, v_year, v_base_number, v_global_number, 0);
  RETURN v_global_number;
END;
$$;
GRANT EXECUTE ON FUNCTION public.next_client_document_number(uuid, uuid, text) TO authenticated;

ALTER TABLE public.proforma_invoices
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_reference text,
  ADD COLUMN IF NOT EXISTS overhead_amount numeric NOT NULL DEFAULT 0 CHECK (overhead_amount >= 0),
  ADD COLUMN IF NOT EXISTS taxable_amount numeric NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  ADD COLUMN IF NOT EXISTS withholding_tax_rate numeric NOT NULL DEFAULT 0 CHECK (withholding_tax_rate >= 0),
  ADD COLUMN IF NOT EXISTS withholding_tax_amount numeric NOT NULL DEFAULT 0 CHECK (withholding_tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS net_amount numeric NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  ADD COLUMN IF NOT EXISTS free_trade_zone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS exclusions text,
  ADD COLUMN IF NOT EXISTS assumptions text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1 CHECK (revision_number > 0);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS proforma_invoice_id uuid REFERENCES public.proforma_invoices(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS proforma_invoices_org_idempotency_idx
  ON public.proforma_invoices(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS proforma_invoices_invoice_id_idx
  ON public.proforma_invoices(organization_id, invoice_id)
  WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS proforma_invoices_client_idx
  ON public.proforma_invoices(organization_id, client_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS proforma_invoices_quotation_idx
  ON public.proforma_invoices(organization_id, quotation_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_proforma_invoice_id_idx
  ON public.invoices(organization_id, proforma_invoice_id)
  WHERE proforma_invoice_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_proforma_invoice_from_quotation(
  _org_id uuid,
  _quotation_id uuid,
  _valid_until date DEFAULT NULL,
  _notes text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS public.proforma_invoices
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_quotation public.quotations;
  v_proforma public.proforma_invoices;
  v_number text;
  v_taxable numeric;
  v_items jsonb;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR has_org_role(auth.uid(), _org_id, 'finance') OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to create proforma invoice';
  END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO v_proforma FROM public.proforma_invoices WHERE organization_id = _org_id AND idempotency_key = _idempotency_key FOR UPDATE;
    IF FOUND THEN RETURN v_proforma; END IF;
  END IF;
  SELECT * INTO v_quotation
  FROM public.quotations
  WHERE id = _quotation_id AND organization_id = _org_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found in organization'; END IF;
  IF v_quotation.status = 'rejected' THEN RAISE EXCEPTION 'A rejected quotation cannot become a proforma invoice'; END IF;
  SELECT * INTO v_proforma
  FROM public.proforma_invoices
  WHERE organization_id = _org_id
    AND quotation_id = _quotation_id
    AND status NOT IN ('cancelled', 'expired')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF FOUND THEN RETURN v_proforma; END IF;
  v_taxable := round(greatest(0,
    coalesce(v_quotation.subtotal, 0)
    - coalesce(v_quotation.discount_amount, 0)
    + coalesce(v_quotation.overhead_amount, 0)
    + coalesce(v_quotation.transport_cost, 0)
  ), 2);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'description', qi.description,
    'quantity', qi.quantity,
    'unit', 'each',
    'unit_price', qi.unit_price,
    'total_price', qi.total_price,
    'item_type', qi.item_type,
    'product_specification_id', qi.product_specification_id,
    'source_quotation_item_id', qi.id
  ) ORDER BY qi.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.quotation_items qi
  WHERE qi.quotation_id = _quotation_id;
  v_number := public.next_client_document_number(_org_id, v_quotation.client_id, 'proforma');
  INSERT INTO public.proforma_invoices (
    organization_id, proforma_number, client_id, quotation_id, issue_date, valid_until, currency,
    subtotal, discount_amount, overhead_amount, tax_amount, tax_rate, taxable_amount,
    transportation_cost, total_amount, net_amount, withholding_tax_rate, withholding_tax_amount,
    items, notes, payment_terms, terms_and_conditions, exclusions, assumptions, site_reference,
    status, source_metadata, idempotency_key, created_by
  ) VALUES (
    _org_id, v_number, v_quotation.client_id, v_quotation.id, current_date, _valid_until, coalesce(v_quotation.currency, 'NGN'),
    coalesce(v_quotation.subtotal, 0), coalesce(v_quotation.discount_amount, 0), coalesce(v_quotation.overhead_amount, 0),
    coalesce(v_quotation.tax_amount, 0), CASE WHEN v_taxable > 0 THEN round(coalesce(v_quotation.tax_amount, 0) / v_taxable * 100, 4) ELSE 0 END,
    v_taxable, coalesce(v_quotation.transport_cost, 0), coalesce(v_quotation.total_amount, 0), coalesce(v_quotation.total_amount, 0),
    0, 0, v_items, coalesce(NULLIF(trim(_notes), ''), v_quotation.notes), v_quotation.payment_terms, v_quotation.terms_and_conditions,
    v_quotation.exclusions, v_quotation.assumptions, v_quotation.site_reference, 'issued',
    jsonb_build_object('source', 'quotation', 'quotation_id', v_quotation.id, 'quotation_number', v_quotation.quotation_number, 'quotation_status', v_quotation.status),
    _idempotency_key, auth.uid()
  ) RETURNING * INTO v_proforma;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_quotation', 'proforma_invoice', v_proforma.id, jsonb_build_object('quotation_id', v_quotation.id, 'quotation_number', v_quotation.quotation_number, 'proforma_number', v_proforma.proforma_number), 'create_proforma_invoice_from_quotation');
  RETURN v_proforma;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_proforma_invoice_from_quotation(uuid, uuid, date, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_proforma_invoice(
  _org_id uuid,
  _proforma_id uuid,
  _decision text,
  _reason text DEFAULT NULL
)
RETURNS public.proforma_invoices
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_proforma public.proforma_invoices;
  v_payload jsonb;
  v_invoice public.invoices;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR has_org_role(auth.uid(), _org_id, 'finance') OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to decide proforma invoice';
  END IF;
  IF _decision NOT IN ('accepted', 'cancelled') THEN RAISE EXCEPTION 'Proforma decision must be accepted or cancelled'; END IF;
  SELECT * INTO v_proforma FROM public.proforma_invoices WHERE id = _proforma_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proforma invoice not found in organization'; END IF;
  IF v_proforma.status IN ('expired', 'cancelled') THEN RAISE EXCEPTION 'This proforma invoice cannot receive a decision'; END IF;
  IF _decision = 'cancelled' THEN
    UPDATE public.proforma_invoices
    SET status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), decision_reason = NULLIF(trim(_reason), ''), updated_at = now()
    WHERE id = _proforma_id AND organization_id = _org_id
    RETURNING * INTO v_proforma;
    INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
    VALUES (_org_id, auth.uid(), 'cancelled', 'proforma_invoice', _proforma_id, to_jsonb(v_proforma), jsonb_build_object('reason', _reason), 'decide_proforma_invoice');
    RETURN v_proforma;
  END IF;
  IF v_proforma.valid_until IS NOT NULL AND v_proforma.valid_until < current_date THEN RAISE EXCEPTION 'Expired proforma invoices cannot be accepted'; END IF;
  IF v_proforma.invoice_id IS NULL THEN
    v_payload := jsonb_build_object(
      'client_id', v_proforma.client_id,
      'quotation_id', v_proforma.quotation_id,
      'sales_order_id', v_proforma.sales_order_id,
      'project_id', v_proforma.project_id,
      'client_po_id', v_proforma.client_po_id,
      'invoice_date', current_date,
      'currency', v_proforma.currency,
      'discount_amount', v_proforma.discount_amount,
      'overhead_amount', v_proforma.overhead_amount,
      'transportation_cost', v_proforma.transportation_cost,
      'tax_rate', v_proforma.tax_rate,
      'withholding_tax_rate', v_proforma.withholding_tax_rate,
      'invoice_kind', 'standard',
      'free_trade_zone', v_proforma.free_trade_zone,
      'payment_terms', v_proforma.payment_terms,
      'terms_and_conditions', v_proforma.terms_and_conditions,
      'site_reference', v_proforma.site_reference,
      'notes', v_proforma.notes,
      'status', 'unpaid',
      'source_metadata', v_proforma.source_metadata || '{}'::jsonb || jsonb_build_object('proforma_invoice_id', v_proforma.id, 'proforma_number', v_proforma.proforma_number),
      'items', v_proforma.items
    );
    v_invoice := public.create_invoice_with_metadata(_org_id, v_payload, 'proforma:' || v_proforma.id::text);
    UPDATE public.invoices
    SET proforma_invoice_id = v_proforma.id,
        source_metadata = coalesce(source_metadata, '{}'::jsonb) || jsonb_build_object('proforma_invoice_id', v_proforma.id, 'proforma_number', v_proforma.proforma_number)
    WHERE id = v_invoice.id AND organization_id = _org_id
    RETURNING * INTO v_invoice;
    UPDATE public.proforma_invoices
    SET invoice_id = v_invoice.id
    WHERE id = v_proforma.id AND organization_id = _org_id;
  ELSE
    SELECT * INTO v_invoice FROM public.invoices WHERE id = v_proforma.invoice_id AND organization_id = _org_id;
  END IF;
  UPDATE public.proforma_invoices
  SET status = 'accepted', accepted_at = coalesce(accepted_at, now()), accepted_by = coalesce(accepted_by, auth.uid()), decision_reason = NULLIF(trim(_reason), ''), updated_at = now()
  WHERE id = _proforma_id AND organization_id = _org_id
  RETURNING * INTO v_proforma;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'accepted_and_converted', 'proforma_invoice', _proforma_id, jsonb_build_object('invoice_id', v_invoice.id, 'invoice_number', v_invoice.document_number, 'reason', _reason), 'decide_proforma_invoice');
  RETURN v_proforma;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decide_proforma_invoice(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_proforma_invoices(_org_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.proforma_invoices
  SET status = 'expired', updated_at = now()
  WHERE status IN ('draft', 'issued')
    AND valid_until IS NOT NULL
    AND valid_until < current_date
    AND (_org_id IS NULL OR organization_id = _org_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.expire_proforma_invoices(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_linked_financial_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entity_type text;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'invoices' THEN 'invoice'
    WHEN 'receipts' THEN 'receipt'
    WHEN 'expenses' THEN 'expense'
    WHEN 'worker_payments' THEN 'worker_payment'
    WHEN 'purchase_orders' THEN 'purchase_order'
    WHEN 'fuel_logs' THEN 'fuel_log'
    WHEN 'director_account_entries' THEN 'director_account'
    WHEN 'hr_staff_loans' THEN 'staff_loan'
    WHEN 'hr_loan_repayments' THEN 'loan_repayment'
    WHEN 'hr_salary_schedules' THEN 'salary_schedule'
    WHEN 'hr_overtime_entries' THEN 'overtime'
    WHEN 'vat_schedule_entries' THEN 'vat_entry'
    WHEN 'hr_external_loans' THEN 'external_loan'
    ELSE NULL
  END;
  IF v_entity_type IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.finance_transaction_links
    WHERE organization_id = OLD.organization_id
      AND entity_type = v_entity_type
      AND entity_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete a bank-linked %; void or reverse the record instead', v_entity_type;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.invoices;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.receipts;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.expenses;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.worker_payments;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.worker_payments FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.purchase_orders;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.fuel_logs;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.fuel_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.director_account_entries;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.director_account_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.hr_staff_loans;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.hr_staff_loans FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.hr_loan_repayments;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.hr_loan_repayments FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.hr_salary_schedules;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.hr_salary_schedules FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.hr_overtime_entries;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.hr_overtime_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.vat_schedule_entries;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.vat_schedule_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();
DROP TRIGGER IF EXISTS prevent_linked_financial_delete ON public.hr_external_loans;
CREATE TRIGGER prevent_linked_financial_delete BEFORE DELETE ON public.hr_external_loans FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_financial_delete();

CREATE OR REPLACE FUNCTION public.link_bank_transaction(
  _org_id uuid,
  _transaction_id uuid,
  _entity_type text,
  _entity_id uuid,
  _linked_amount numeric,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_link_id uuid;
  v_transaction public.bank_transactions%ROWTYPE;
  v_existing_amount numeric := 0;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to link bank transactions';
  END IF;
  IF _linked_amount IS NULL OR _linked_amount <= 0 THEN RAISE EXCEPTION 'Linked amount must be greater than zero'; END IF;
  SELECT * INTO v_transaction FROM public.bank_transactions WHERE id = _transaction_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank transaction not found in organization'; END IF;
  IF v_transaction.review_status NOT IN ('approved', 'suggested', 'linked') THEN RAISE EXCEPTION 'Bank transaction must be approved before linking'; END IF;
  IF _linked_amount > v_transaction.amount THEN RAISE EXCEPTION 'Linked amount cannot exceed the bank transaction amount'; END IF;
  SELECT coalesce(sum(linked_amount), 0) INTO v_existing_amount
  FROM public.finance_transaction_links
  WHERE organization_id = _org_id AND bank_transaction_id = _transaction_id
    AND NOT (entity_type = _entity_type AND entity_id = _entity_id);
  IF v_existing_amount + _linked_amount > v_transaction.amount THEN
    RAISE EXCEPTION 'Total linked amounts cannot exceed the bank transaction amount';
  END IF;
  IF _entity_type NOT IN ('invoice','receipt','expense','worker_payment','purchase_order','fuel_log','director_account','staff_loan','loan_repayment','salary_schedule','overtime','vat_entry','external_loan','transfer') THEN RAISE EXCEPTION 'Unsupported financial entity type'; END IF;
  IF _entity_type = 'invoice' AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Invoice not found in organization'; END IF;
  IF _entity_type = 'receipt' AND NOT EXISTS (SELECT 1 FROM public.receipts WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Receipt not found in organization'; END IF;
  IF _entity_type = 'expense' AND NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Expense not found in organization'; END IF;
  IF _entity_type = 'worker_payment' AND NOT EXISTS (SELECT 1 FROM public.worker_payments WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Worker payment not found in organization'; END IF;
  IF _entity_type = 'purchase_order' AND NOT EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Purchase order not found in organization'; END IF;
  IF _entity_type = 'fuel_log' AND NOT EXISTS (SELECT 1 FROM public.fuel_logs WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Fuel log not found in organization'; END IF;
  IF _entity_type = 'director_account' AND NOT EXISTS (SELECT 1 FROM public.director_account_entries WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Director account entry not found in organization'; END IF;
  IF _entity_type = 'staff_loan' AND NOT EXISTS (SELECT 1 FROM public.hr_staff_loans WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Staff loan not found in organization'; END IF;
  IF _entity_type = 'loan_repayment' AND NOT EXISTS (SELECT 1 FROM public.hr_loan_repayments WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Loan repayment not found in organization'; END IF;
  IF _entity_type = 'salary_schedule' AND NOT EXISTS (SELECT 1 FROM public.hr_salary_schedules WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Salary schedule not found in organization'; END IF;
  IF _entity_type = 'overtime' AND NOT EXISTS (SELECT 1 FROM public.hr_overtime_entries WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Overtime entry not found in organization'; END IF;
  IF _entity_type = 'vat_entry' AND NOT EXISTS (SELECT 1 FROM public.vat_schedule_entries WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'VAT entry not found in organization'; END IF;
  IF _entity_type = 'external_loan' AND NOT EXISTS (SELECT 1 FROM public.hr_external_loans WHERE id = _entity_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'External loan not found in organization'; END IF;
  INSERT INTO public.finance_transaction_links (organization_id, bank_transaction_id, entity_type, entity_id, linked_amount, linked_by, notes)
  VALUES (_org_id, _transaction_id, _entity_type, _entity_id, round(_linked_amount, 2), auth.uid(), NULLIF(trim(_notes), ''))
  ON CONFLICT (organization_id, bank_transaction_id, entity_type, entity_id)
  DO UPDATE SET linked_amount = EXCLUDED.linked_amount, linked_by = EXCLUDED.linked_by, linked_at = now(), notes = EXCLUDED.notes
  RETURNING id INTO v_link_id;
  UPDATE public.bank_transactions SET review_status = 'linked', reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _transaction_id AND organization_id = _org_id;
  RETURN v_link_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.link_bank_transaction(uuid, uuid, text, uuid, numeric, text) TO authenticated;

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS approved_days integer NOT NULL DEFAULT 0 CHECK (approved_days >= 0);
UPDATE public.leave_requests
SET approved_days = CASE WHEN status = 'approved' THEN GREATEST(0, (end_date - start_date) + 1) ELSE 0 END
WHERE approved_days = 0;

CREATE OR REPLACE VIEW public.hr_leave_usage_summary AS
SELECT
  organization_id,
  user_id,
  leave_type,
  EXTRACT(YEAR FROM start_date)::integer AS leave_year,
  SUM(approved_days)::integer AS approved_days,
  COUNT(*)::integer AS approved_request_count
FROM public.leave_requests
WHERE status = 'approved'
GROUP BY organization_id, user_id, leave_type, EXTRACT(YEAR FROM start_date)::integer;
GRANT SELECT ON public.hr_leave_usage_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.review_leave_request(_org_id uuid, _leave_id uuid, _review_status text, _notes text DEFAULT NULL)
RETURNS public.leave_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_previous public.leave_requests;
  v_result public.leave_requests;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to review leave request'; END IF;
  IF _review_status NOT IN ('pending', 'reviewed', 'returned') THEN RAISE EXCEPTION 'Invalid HR review status'; END IF;
  SELECT * INTO v_previous FROM public.leave_requests WHERE id = _leave_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leave request not found'; END IF;
  UPDATE public.leave_requests
  SET hr_review_status = _review_status,
      hr_reviewed_by = auth.uid(),
      hr_reviewed_at = now(),
      reason = COALESCE(NULLIF(trim(_notes), ''), reason)
  WHERE id = _leave_id AND organization_id = _org_id
  RETURNING * INTO v_result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
  VALUES (_org_id, auth.uid(), 'hr_reviewed', 'leave_request', _leave_id, to_jsonb(v_previous), to_jsonb(v_result), 'review_leave_request');
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_leave_request(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_leave_request(_org_id uuid, _leave_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS public.leave_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_previous public.leave_requests;
  v_result public.leave_requests;
  v_approver_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.hr_workflow_settings s WHERE s.organization_id = _org_id AND s.md_approver_id = auth.uid()) INTO v_approver_ok;
  IF NOT (v_approver_ok OR has_org_role(auth.uid(), _org_id, 'administrator') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Only the configured MD may decide leave requests'; END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid MD decision'; END IF;
  SELECT * INTO v_previous FROM public.leave_requests WHERE id = _leave_id AND organization_id = _org_id AND hr_review_status = 'reviewed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leave request is not reviewed or was not found'; END IF;
  UPDATE public.leave_requests
  SET md_decision = _decision,
      md_decided_by = auth.uid(),
      md_decided_at = now(),
      md_decision_reason = NULLIF(trim(_reason), ''),
      status = _decision,
      approved_by = CASE WHEN _decision = 'approved' THEN auth.uid() ELSE NULL END,
      approved_days = CASE WHEN _decision = 'approved' THEN GREATEST(0, (end_date - start_date) + 1) ELSE 0 END
  WHERE id = _leave_id AND organization_id = _org_id
  RETURNING * INTO v_result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
  VALUES (_org_id, auth.uid(), 'md_decided', 'leave_request', _leave_id, to_jsonb(v_previous), to_jsonb(v_result), 'decide_leave_request');
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decide_leave_request(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_disciplinary_record(_org_id uuid, _record_id uuid, _review_status text)
RETURNS public.disciplinary_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_previous public.disciplinary_records;
  v_result public.disciplinary_records;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to review disciplinary record'; END IF;
  IF _review_status NOT IN ('pending', 'reviewed', 'returned') THEN RAISE EXCEPTION 'Invalid HR review status'; END IF;
  SELECT * INTO v_previous FROM public.disciplinary_records WHERE id = _record_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disciplinary record not found'; END IF;
  UPDATE public.disciplinary_records SET hr_review_status = _review_status WHERE id = _record_id AND organization_id = _org_id RETURNING * INTO v_result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
  VALUES (_org_id, auth.uid(), 'hr_reviewed', 'disciplinary_record', _record_id, to_jsonb(v_previous), to_jsonb(v_result), 'review_disciplinary_record');
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_disciplinary_record(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_disciplinary_record(_org_id uuid, _record_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS public.disciplinary_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_previous public.disciplinary_records;
  v_result public.disciplinary_records;
  v_approver_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.hr_workflow_settings s WHERE s.organization_id = _org_id AND s.md_approver_id = auth.uid()) INTO v_approver_ok;
  IF NOT (v_approver_ok OR has_org_role(auth.uid(), _org_id, 'administrator') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Only the configured MD may decide disciplinary records'; END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid MD decision'; END IF;
  SELECT * INTO v_previous FROM public.disciplinary_records WHERE id = _record_id AND organization_id = _org_id AND hr_review_status = 'reviewed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disciplinary record is not reviewed or was not found'; END IF;
  UPDATE public.disciplinary_records SET md_decision = _decision, md_decided_by = auth.uid(), md_decided_at = now(), md_decision_reason = NULLIF(trim(_reason), '') WHERE id = _record_id AND organization_id = _org_id RETURNING * INTO v_result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
  VALUES (_org_id, auth.uid(), 'md_decided', 'disciplinary_record', _record_id, to_jsonb(v_previous), to_jsonb(v_result), 'decide_disciplinary_record');
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decide_disciplinary_record(uuid, uuid, text, text) TO authenticated;
