-- Production UAT integrity repairs.
-- The migration is intentionally idempotent so environments that already contain
-- parts of the industrial foundation can safely apply the missing pieces.

CREATE TABLE IF NOT EXISTS public.document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  is_current boolean NOT NULL DEFAULT true,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_reason text NOT NULL DEFAULT 'Operational revision',
  UNIQUE (organization_id, entity_type, entity_id, revision_number)
);

ALTER TABLE public.document_revisions
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS change_reason text NOT NULL DEFAULT 'Operational revision';

CREATE INDEX IF NOT EXISTS idx_document_revisions_entity
  ON public.document_revisions(organization_id, entity_type, entity_id, revision_number DESC);

ALTER TABLE public.document_revisions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_revisions TO authenticated;
DROP POLICY IF EXISTS "Members can view document revisions" ON public.document_revisions;
DROP POLICY IF EXISTS "Authorized users manage document revisions" ON public.document_revisions;
CREATE POLICY "Members can view document revisions"
  ON public.document_revisions FOR SELECT TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Authorized users manage document revisions"
  ON public.document_revisions FOR ALL TO authenticated
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.create_worker_payment_from_salary_schedule(_org_id uuid, _schedule_id uuid)
RETURNS public.worker_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE schedule_row public.hr_salary_schedules; payment_row public.worker_payments;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to pay salary schedule'; END IF;
  SELECT * INTO schedule_row FROM public.hr_salary_schedules WHERE id = _schedule_id AND organization_id = _org_id FOR UPDATE;
  IF schedule_row.id IS NULL OR schedule_row.status <> 'approved' THEN RAISE EXCEPTION 'Salary schedule must be approved before payment'; END IF;
  IF schedule_row.payment_id IS NOT NULL THEN SELECT * INTO payment_row FROM public.worker_payments WHERE id = schedule_row.payment_id; RETURN payment_row; END IF;
  INSERT INTO public.worker_payments (
    organization_id, user_id, type, amount, basic_salary, gross_pay, net_pay,
    paye_tax, pension_employee, pension_employer, nhf_deduction, other_deductions,
    description, date, created_by, bank_account_id
  ) VALUES (
    _org_id, schedule_row.employee_id, 'salary', schedule_row.net_pay, 0, schedule_row.gross_salary, schedule_row.net_pay,
    schedule_row.tax, schedule_row.pension, 0, 0,
    schedule_row.deductions + schedule_row.loan_repayment + schedule_row.absenteeism_deduction + schedule_row.suspension_deduction + schedule_row.other_deductions,
    format('Salary schedule %s to %s', schedule_row.period_start, schedule_row.period_end), current_date, auth.uid(), schedule_row.bank_account_id
  ) RETURNING * INTO payment_row;
  UPDATE public.hr_salary_schedules SET status = 'paid', payment_id = payment_row.id WHERE id = schedule_row.id;
  RETURN payment_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_worker_payment_from_overtime(_org_id uuid, _entry_id uuid)
RETURNS public.worker_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE entry_row public.hr_overtime_entries; payment_row public.worker_payments;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to pay overtime'; END IF;
  SELECT * INTO entry_row FROM public.hr_overtime_entries WHERE id = _entry_id AND organization_id = _org_id FOR UPDATE;
  IF entry_row.id IS NULL OR entry_row.status <> 'approved' THEN RAISE EXCEPTION 'Overtime must be approved before payment'; END IF;
  IF entry_row.payment_id IS NOT NULL THEN SELECT * INTO payment_row FROM public.worker_payments WHERE id = entry_row.payment_id; RETURN payment_row; END IF;
  INSERT INTO public.worker_payments (
    organization_id, user_id, type, amount, gross_pay, net_pay, description, date, created_by, bank_account_id
  ) VALUES (
    _org_id, entry_row.employee_id, 'overtime', entry_row.overtime_earnings, entry_row.overtime_earnings, entry_row.overtime_earnings,
    format('Overtime %s', entry_row.period_month), current_date, auth.uid(), entry_row.bank_account_id
  ) RETURNING * INTO payment_row;
  UPDATE public.hr_overtime_entries SET status = 'paid', payment_id = payment_row.id WHERE id = entry_row.id;
  RETURN payment_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_staff_loan_repayment(_org_id uuid, _loan_id uuid, _amount numeric, _payment_date date DEFAULT current_date, _notes text DEFAULT NULL)
RETURNS public.hr_loan_repayments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE loan_row public.hr_staff_loans; repayment_row public.hr_loan_repayments; new_balance numeric;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to record loan repayment'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Repayment amount must be positive'; END IF;
  SELECT * INTO loan_row FROM public.hr_staff_loans WHERE id = _loan_id AND organization_id = _org_id FOR UPDATE;
  IF loan_row.id IS NULL OR loan_row.status <> 'active' THEN RAISE EXCEPTION 'Active loan not found'; END IF;
  IF _amount > loan_row.outstanding_balance THEN RAISE EXCEPTION 'Repayment exceeds outstanding balance'; END IF;
  INSERT INTO public.worker_payments (
    organization_id, user_id, type, amount, net_pay, description, date, created_by, bank_account_id
  ) VALUES (
    _org_id, loan_row.employee_id, 'loan_repayment', _amount, _amount,
    format('Staff loan repayment for loan %s', loan_row.id), _payment_date, auth.uid(), loan_row.bank_account_id
  ) RETURNING id INTO repayment_row.payment_id;
  INSERT INTO public.hr_loan_repayments (organization_id, loan_id, amount, payment_date, payment_id, recorded_by, notes)
  VALUES (_org_id, _loan_id, _amount, _payment_date, repayment_row.payment_id, auth.uid(), _notes)
  RETURNING * INTO repayment_row;
  new_balance := GREATEST(0, loan_row.outstanding_balance - _amount);
  UPDATE public.hr_staff_loans SET payments_made = payments_made + _amount, outstanding_balance = new_balance, status = CASE WHEN new_balance = 0 THEN 'completed' ELSE status END WHERE id = _loan_id;
  RETURN repayment_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_worker_payment_from_salary_schedule(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_worker_payment_from_overtime(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_staff_loan_repayment(uuid, uuid, numeric, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_proforma_invoice(_org_id uuid, _proforma_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS public.proforma_invoices
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_proforma public.proforma_invoices;
  v_quotation public.quotations;
  v_payload jsonb;
  v_invoice public.invoices;
  v_tax_rate numeric;
  v_target_taxable numeric;
  v_base_taxable numeric;
  v_profit_adjustment numeric;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR has_org_role(auth.uid(), _org_id, 'finance') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to decide proforma invoice'; END IF;
  IF _decision NOT IN ('accepted', 'cancelled') THEN RAISE EXCEPTION 'Proforma decision must be accepted or cancelled'; END IF;
  SELECT * INTO v_proforma FROM public.proforma_invoices WHERE id = _proforma_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proforma invoice not found in organization'; END IF;
  IF v_proforma.status IN ('expired', 'cancelled') THEN RAISE EXCEPTION 'This proforma invoice cannot receive a decision'; END IF;
  IF _decision = 'cancelled' THEN
    UPDATE public.proforma_invoices SET status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), decision_reason = NULLIF(trim(_reason), ''), updated_at = now() WHERE id = _proforma_id AND organization_id = _org_id RETURNING * INTO v_proforma;
    INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source) VALUES (_org_id, auth.uid(), 'cancelled', 'proforma_invoice', _proforma_id, to_jsonb(v_proforma), jsonb_build_object('reason', _reason), 'decide_proforma_invoice');
    RETURN v_proforma;
  END IF;
  IF v_proforma.valid_until IS NOT NULL AND v_proforma.valid_until < current_date THEN RAISE EXCEPTION 'Expired proforma invoices cannot be accepted'; END IF;
  IF v_proforma.invoice_id IS NULL THEN
    SELECT * INTO v_quotation FROM public.quotations WHERE id = v_proforma.quotation_id AND organization_id = _org_id;
    v_tax_rate := COALESCE(v_proforma.tax_rate, 0);
    v_target_taxable := ROUND(COALESCE(v_proforma.total_amount, 0) / (1 + v_tax_rate / 100), 2);
    v_base_taxable := ROUND(COALESCE(v_proforma.subtotal, 0) - COALESCE(v_proforma.discount_amount, 0) + COALESCE(v_proforma.overhead_amount, 0) + COALESCE(v_proforma.transportation_cost, 0), 2);
    v_profit_adjustment := ROUND(v_target_taxable - v_base_taxable, 2);
    v_payload := jsonb_build_object(
      'client_id', v_proforma.client_id,
      'quotation_id', v_proforma.quotation_id,
      'sales_order_id', v_proforma.sales_order_id,
      'project_id', v_proforma.project_id,
      'client_po_id', v_proforma.client_po_id,
      'invoice_date', current_date,
      'currency', v_proforma.currency,
      'discount_amount', v_proforma.discount_amount,
      'overhead_amount', COALESCE(v_proforma.overhead_amount, 0) + v_profit_adjustment,
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
      'source_metadata', v_proforma.source_metadata || '{}'::jsonb || jsonb_build_object('proforma_invoice_id', v_proforma.id, 'proforma_number', v_proforma.proforma_number, 'quotation_profit_margin_percent', v_quotation.profit_margin_percent, 'proforma_profit_adjustment', v_profit_adjustment),
      'items', v_proforma.items
    );
    v_invoice := public.create_invoice_with_metadata(_org_id, v_payload, 'proforma:' || v_proforma.id::text);
    UPDATE public.invoices SET proforma_invoice_id = v_proforma.id, source_metadata = COALESCE(source_metadata, '{}'::jsonb) || jsonb_build_object('proforma_invoice_id', v_proforma.id, 'proforma_number', v_proforma.proforma_number, 'quotation_profit_margin_percent', v_quotation.profit_margin_percent, 'proforma_profit_adjustment', v_profit_adjustment) WHERE id = v_invoice.id AND organization_id = _org_id RETURNING * INTO v_invoice;
    UPDATE public.proforma_invoices SET invoice_id = v_invoice.id WHERE id = v_proforma.id AND organization_id = _org_id;
  END IF;
  UPDATE public.proforma_invoices SET status = 'accepted', accepted_at = COALESCE(accepted_at, now()), accepted_by = COALESCE(accepted_by, auth.uid()), decision_reason = NULLIF(trim(_reason), ''), updated_at = now() WHERE id = _proforma_id AND organization_id = _org_id RETURNING * INTO v_proforma;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source) VALUES (_org_id, auth.uid(), 'accepted_and_converted', 'proforma_invoice', _proforma_id, jsonb_build_object('invoice_id', v_invoice.id, 'invoice_number', v_invoice.document_number, 'invoice_total', v_invoice.total_amount, 'proforma_total', v_proforma.total_amount, 'reason', _reason), 'decide_proforma_invoice');
  RETURN v_proforma;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decide_proforma_invoice(uuid, uuid, text, text) TO authenticated;
