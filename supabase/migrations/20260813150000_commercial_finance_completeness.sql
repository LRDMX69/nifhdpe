-- Industrial commercial and finance completeness extensions.
-- All policy-sensitive values remain configurable or explicitly supplied by the user.

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS overhead_amount numeric NOT NULL DEFAULT 0 CHECK (overhead_amount >= 0),
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS exclusions text,
  ADD COLUMN IF NOT EXISTS assumptions text,
  ADD COLUMN IF NOT EXISTS quote_version integer NOT NULL DEFAULT 1 CHECK (quote_version > 0),
  ADD COLUMN IF NOT EXISTS site_reference text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN';

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS cost_code text;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS overhead_amount numeric NOT NULL DEFAULT 0 CHECK (overhead_amount >= 0),
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN';

CREATE INDEX IF NOT EXISTS quotations_opportunity_idx ON public.quotations(organization_id, opportunity_id);
CREATE INDEX IF NOT EXISTS invoices_project_idx ON public.invoices(organization_id, project_id);
CREATE INDEX IF NOT EXISTS invoices_due_status_idx ON public.invoices(organization_id, due_date, status);
CREATE INDEX IF NOT EXISTS invoice_items_product_idx ON public.invoice_items(product_specification_id);

DROP POLICY IF EXISTS "Members can view invoices" ON public.invoices;
CREATE POLICY "Members can view invoices" ON public.invoices FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.get_finance_period_report(_org_id uuid, _from date, _to date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_member_of_org(auth.uid(), _org_id) THEN RAISE EXCEPTION 'Not authorized to view finance report'; END IF;
  IF _from IS NULL OR _to IS NULL OR _from > _to THEN RAISE EXCEPTION 'Invalid finance report date range'; END IF;

  SELECT jsonb_build_object(
    'period', jsonb_build_object('from', _from, 'to', _to),
    'invoiced', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE organization_id = _org_id AND COALESCE(invoice_date, created_at::date) BETWEEN _from AND _to AND status <> 'draft'), 0),
    'collected', COALESCE((SELECT SUM(amount_received) FROM public.receipts WHERE organization_id = _org_id AND COALESCE(payment_date, created_at::date) BETWEEN _from AND _to), 0),
    'operating_expenses', COALESCE((SELECT SUM(amount) FROM public.expenses WHERE organization_id = _org_id AND date BETWEEN _from AND _to), 0),
    'worker_payments', COALESCE((SELECT SUM(amount) FROM public.worker_payments WHERE organization_id = _org_id AND date BETWEEN _from AND _to), 0),
    'invoice_count', (SELECT COUNT(*) FROM public.invoices WHERE organization_id = _org_id AND COALESCE(invoice_date, created_at::date) BETWEEN _from AND _to AND status <> 'draft'),
    'receipt_count', (SELECT COUNT(*) FROM public.receipts WHERE organization_id = _org_id AND COALESCE(payment_date, created_at::date) BETWEEN _from AND _to),
    'aging', jsonb_build_object(
      'current', COALESCE((SELECT SUM(balance_due) FROM public.invoices WHERE organization_id = _org_id AND balance_due > 0 AND (due_date IS NULL OR due_date >= current_date)), 0),
      '1_30', COALESCE((SELECT SUM(balance_due) FROM public.invoices WHERE organization_id = _org_id AND balance_due > 0 AND due_date < current_date AND due_date >= current_date - 30), 0),
      '31_60', COALESCE((SELECT SUM(balance_due) FROM public.invoices WHERE organization_id = _org_id AND balance_due > 0 AND due_date < current_date - 30 AND due_date >= current_date - 60), 0),
      '61_90', COALESCE((SELECT SUM(balance_due) FROM public.invoices WHERE organization_id = _org_id AND balance_due > 0 AND due_date < current_date - 60 AND due_date >= current_date - 90), 0),
      '90_plus', COALESCE((SELECT SUM(balance_due) FROM public.invoices WHERE organization_id = _org_id AND balance_due > 0 AND due_date < current_date - 90), 0)
    ),
    'monthly', COALESCE((SELECT jsonb_agg(month_row ORDER BY month_start) FROM (
      SELECT date_trunc('month', d)::date AS month_start,
        jsonb_build_object(
          'month', to_char(date_trunc('month', d), 'YYYY-MM'),
          'invoiced', COALESCE((SELECT SUM(total_amount) FROM public.invoices i WHERE i.organization_id = _org_id AND COALESCE(i.invoice_date, i.created_at::date) >= date_trunc('month', d)::date AND COALESCE(i.invoice_date, i.created_at::date) < (date_trunc('month', d) + interval '1 month')::date AND i.status <> 'draft'), 0),
          'collected', COALESCE((SELECT SUM(amount_received) FROM public.receipts r WHERE r.organization_id = _org_id AND COALESCE(r.payment_date, r.created_at::date) >= date_trunc('month', d)::date AND COALESCE(r.payment_date, r.created_at::date) < (date_trunc('month', d) + interval '1 month')::date), 0),
          'expenses', COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.organization_id = _org_id AND e.date >= date_trunc('month', d)::date AND e.date < (date_trunc('month', d) + interval '1 month')::date), 0),
          'worker_payments', COALESCE((SELECT SUM(amount) FROM public.worker_payments p WHERE p.organization_id = _org_id AND p.date >= date_trunc('month', d)::date AND p.date < (date_trunc('month', d) + interval '1 month')::date), 0)
        ) AS month_row
      FROM generate_series(date_trunc('month', _from)::date, date_trunc('month', _to)::date, interval '1 month') d
    ) monthly_rows), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_period_report(uuid, date, date) TO authenticated;


CREATE OR REPLACE FUNCTION public.create_invoice_from_sales_order(_org_id uuid, _order_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  o public.sales_orders;
  q public.quotations;
  inv public.invoices;
  invoice_no text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to create invoice'; END IF;
  SELECT * INTO o FROM public.sales_orders WHERE id = _order_id AND organization_id = _org_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Sales order not found'; END IF;
  IF o.status NOT IN ('confirmed','partially_fulfilled','fulfilled') THEN RAISE EXCEPTION 'Order is not ready for invoicing'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE sales_order_id = _order_id AND status <> 'cancelled') THEN RAISE EXCEPTION 'An invoice already exists for this order'; END IF;
  IF o.quotation_id IS NOT NULL THEN SELECT * INTO q FROM public.quotations WHERE id = o.quotation_id AND organization_id = _org_id; END IF;
  SELECT next_doc_number(_org_id, 'invoices') INTO invoice_no;
  INSERT INTO public.invoices (organization_id, document_number, client_id, quotation_id, sales_order_id, project_id, subtotal, discount_amount, overhead_amount, tax_rate, tax_amount, total_amount, balance_due, payment_terms, terms_and_conditions, status, created_by, invoice_date)
  VALUES (_org_id, invoice_no, o.client_id, o.quotation_id, o.id, o.project_id, o.subtotal, COALESCE(q.discount_amount, 0), COALESCE(q.overhead_amount, 0), CASE WHEN COALESCE(q.tax_amount, 0) > 0 AND COALESCE(o.total_amount, 0) > 0 THEN (q.tax_amount / o.total_amount) * 100 ELSE 0 END, COALESCE(q.tax_amount, 0), o.total_amount, o.total_amount, q.payment_terms, q.terms_and_conditions, 'unpaid', auth.uid(), current_date) RETURNING * INTO inv;
  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, total_price, item_type, product_specification_id)
  SELECT inv.id, description, quantity, unit_price, total_price, COALESCE(configurable_attributes->>'item_type', 'other'), product_specification_id FROM public.sales_order_items WHERE sales_order_id = _order_id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_sales_order', 'invoice', inv.id, jsonb_build_object('sales_order_id', _order_id, 'quotation_id', o.quotation_id, 'project_id', o.project_id), 'create_invoice_from_sales_order');
  RETURN inv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice_from_sales_order(uuid, uuid) TO authenticated;
