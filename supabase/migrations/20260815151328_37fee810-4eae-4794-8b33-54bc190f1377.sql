-- NIFHDPE HR, finance, commercial evidence, and operational oversight connectors.
-- Policy-sensitive values remain configurable; no tax, bank, leave, loan, or MD policy is invented here.

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_type text NOT NULL DEFAULT 'bank',
  account_number text,
  currency text NOT NULL DEFAULT 'NGN',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, account_name)
);

CREATE TABLE IF NOT EXISTS public.document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  label text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  attachment_id uuid REFERENCES public.document_attachments(id) ON DELETE SET NULL,
  issue_date date,
  expected_delivery_date date,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','under_review','accepted','rejected','closed')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, po_number)
);

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS client_po_id uuid REFERENCES public.client_purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tax_identification_number text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS local_government text;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_po_id uuid REFERENCES public.client_purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_kind text NOT NULL DEFAULT 'standard' CHECK (invoice_kind IN ('standard','credit_note','debit_note')),
  ADD COLUMN IF NOT EXISTS withholding_tax_rate numeric NOT NULL DEFAULT 0 CHECK (withholding_tax_rate >= 0),
  ADD COLUMN IF NOT EXISTS withholding_tax_amount numeric NOT NULL DEFAULT 0 CHECK (withholding_tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS transportation_cost numeric NOT NULL DEFAULT 0 CHECK (transportation_cost >= 0),
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1 CHECK (revision_number > 0);

CREATE TABLE IF NOT EXISTS public.proforma_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proforma_number text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_po_id uuid REFERENCES public.client_purchase_orders(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT current_date,
  valid_until date,
  currency text NOT NULL DEFAULT 'NGN',
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  transportation_cost numeric NOT NULL DEFAULT 0 CHECK (transportation_cost >= 0),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','accepted','expired','cancelled')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, proforma_number)
);

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS folio text,
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expense_scope text NOT NULL DEFAULT 'administrative' CHECK (expense_scope IN ('site','administrative','project','other')),
  ADD COLUMN IF NOT EXISTS site_reference text,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS logistics_amount numeric NOT NULL DEFAULT 0 CHECK (logistics_amount >= 0),
  ADD COLUMN IF NOT EXISTS part_payment numeric NOT NULL DEFAULT 0 CHECK (part_payment >= 0),
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric NOT NULL DEFAULT 0 CHECK (outstanding_balance >= 0),
  ADD COLUMN IF NOT EXISTS supporting_document_id uuid REFERENCES public.document_attachments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.finance_accounts(id) ON DELETE RESTRICT,
  statement_reference text,
  period_start date,
  period_end date,
  opening_balance numeric,
  closing_balance numeric,
  file_attachment_id uuid REFERENCES public.document_attachments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'imported' CHECK (status IN ('imported','processing','under_review','reconciled','closed')),
  imported_by uuid NOT NULL REFERENCES auth.users(id),
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  statement_id uuid NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.finance_accounts(id) ON DELETE RESTRICT,
  transaction_date date NOT NULL,
  value_date date,
  description text,
  reference text,
  folio text,
  amount numeric NOT NULL,
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  running_balance numeric,
  suggested_category text,
  suggested_entity_type text,
  suggested_entity_id uuid,
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  review_status text NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review','suggested','approved','rejected','linked')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.finance_accounts(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  statement_id uuid REFERENCES public.bank_statements(id) ON DELETE SET NULL,
  expected_balance numeric,
  actual_balance numeric,
  difference numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','reconciled','exception')),
  discrepancy_reason text,
  reconciled_by uuid REFERENCES auth.users(id),
  reconciled_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_workflow_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  md_approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  working_days_per_month numeric CHECK (working_days_per_month IS NULL OR working_days_per_month > 0),
  payroll_period_start_day integer CHECK (payroll_period_start_day IS NULL OR payroll_period_start_day BETWEEN 1 AND 28),
  notes text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_salary_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  account_number text,
  gross_salary numeric NOT NULL DEFAULT 0 CHECK (gross_salary >= 0),
  pension numeric NOT NULL DEFAULT 0 CHECK (pension >= 0),
  voluntary_contribution numeric NOT NULL DEFAULT 0 CHECK (voluntary_contribution >= 0),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  deductions numeric NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  loan_repayment numeric NOT NULL DEFAULT 0 CHECK (loan_repayment >= 0),
  absenteeism_deduction numeric NOT NULL DEFAULT 0 CHECK (absenteeism_deduction >= 0),
  suspension_deduction numeric NOT NULL DEFAULT 0 CHECK (suspension_deduction >= 0),
  other_deductions numeric NOT NULL DEFAULT 0 CHECK (other_deductions >= 0),
  net_pay numeric NOT NULL DEFAULT 0 CHECK (net_pay >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','paid')),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  payment_id uuid REFERENCES public.worker_payments(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_overtime_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  period_month date NOT NULL,
  monthly_gross numeric NOT NULL DEFAULT 0 CHECK (monthly_gross >= 0),
  working_days_basis numeric CHECK (working_days_basis IS NULL OR working_days_basis > 0),
  daily_rate numeric NOT NULL DEFAULT 0 CHECK (daily_rate >= 0),
  overtime_days numeric NOT NULL DEFAULT 0 CHECK (overtime_days >= 0),
  overtime_earnings numeric NOT NULL DEFAULT 0 CHECK (overtime_earnings >= 0),
  bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  account_number text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','paid')),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  payment_id uuid REFERENCES public.worker_payments(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_staff_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  additional_loan numeric NOT NULL DEFAULT 0 CHECK (additional_loan >= 0),
  repayment_period_months integer NOT NULL CHECK (repayment_period_months > 0),
  start_date date NOT NULL,
  end_date date,
  monthly_repayment numeric NOT NULL DEFAULT 0 CHECK (monthly_repayment >= 0),
  payments_made numeric NOT NULL DEFAULT 0 CHECK (payments_made >= 0),
  outstanding_balance numeric NOT NULL DEFAULT 0 CHECK (outstanding_balance >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','cancelled')),
  approved_by uuid REFERENCES auth.users(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.hr_staff_loans(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  payment_id uuid REFERENCES public.worker_payments(id) ON DELETE SET NULL,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_external_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lender text NOT NULL,
  loan_date date NOT NULL,
  principal_amount numeric NOT NULL CHECK (principal_amount >= 0),
  monthly_payment numeric NOT NULL DEFAULT 0 CHECK (monthly_payment >= 0),
  remaining_balance numeric NOT NULL DEFAULT 0 CHECK (remaining_balance >= 0),
  account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  folio text,
  supporting_document_id uuid REFERENCES public.document_attachments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_hmo_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  coverage_start date NOT NULL,
  coverage_end date NOT NULL,
  family_classification text NOT NULL DEFAULT 'individual',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','expired','cancelled')),
  notes text,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vat_schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  client_tin text,
  client_name text NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  output_vat numeric NOT NULL DEFAULT 0,
  input_vat numeric NOT NULL DEFAULT 0,
  withholding_tax numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  state text,
  local_government text,
  vat_withheld numeric NOT NULL DEFAULT 0,
  free_trade_zone boolean NOT NULL DEFAULT false,
  vat_paid numeric NOT NULL DEFAULT 0,
  vat_payable numeric NOT NULL DEFAULT 0,
  vat_credit numeric NOT NULL DEFAULT 0,
  penalty numeric NOT NULL DEFAULT 0,
  interest numeric NOT NULL DEFAULT 0,
  brought_forward numeric NOT NULL DEFAULT 0,
  lrp numeric NOT NULL DEFAULT 0,
  total_vat_credit_payable numeric NOT NULL DEFAULT 0,
  source_entity_type text,
  source_entity_id uuid,
  note text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS hr_review_status text NOT NULL DEFAULT 'pending' CHECK (hr_review_status IN ('pending','reviewed','returned')),
  ADD COLUMN IF NOT EXISTS hr_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS hr_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS md_decision text CHECK (md_decision IS NULL OR md_decision IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS md_decided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS md_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS md_decision_reason text;

ALTER TABLE public.disciplinary_records
  ADD COLUMN IF NOT EXISTS hr_review_status text NOT NULL DEFAULT 'reviewed' CHECK (hr_review_status IN ('pending','reviewed','returned')),
  ADD COLUMN IF NOT EXISTS md_decision text CHECK (md_decision IS NULL OR md_decision IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS md_decided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS md_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS md_decision_reason text;

CREATE INDEX IF NOT EXISTS client_purchase_orders_client_idx ON public.client_purchase_orders(organization_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_attachments_entity_idx ON public.document_attachments(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS bank_transactions_review_idx ON public.bank_transactions(organization_id, review_status, transaction_date);
CREATE INDEX IF NOT EXISTS hr_salary_schedule_period_idx ON public.hr_salary_schedules(organization_id, period_start, status);
CREATE INDEX IF NOT EXISTS hr_overtime_period_idx ON public.hr_overtime_entries(organization_id, period_month, status);
CREATE INDEX IF NOT EXISTS hr_staff_loans_employee_idx ON public.hr_staff_loans(organization_id, employee_id, status);
CREATE INDEX IF NOT EXISTS vat_schedule_date_idx ON public.vat_schedule_entries(organization_id, entry_date);

-- Add HR to the existing central client master write path without changing administrator semantics.
DROP POLICY IF EXISTS "HR can insert clients" ON public.clients;
CREATE POLICY "HR can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
DROP POLICY IF EXISTS "HR can update clients" ON public.clients;
CREATE POLICY "HR can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));

-- Generic organization-scoped policies for the new records.
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_salary_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_overtime_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_staff_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_external_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_hmo_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view finance accounts" ON public.finance_accounts FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Finance HR admin manage finance accounts" ON public.finance_accounts FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view document attachments" ON public.document_attachments FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Finance HR admin manage document attachments" ON public.document_attachments FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view client purchase orders" ON public.client_purchase_orders FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Sales HR finance admin manage client purchase orders" ON public.client_purchase_orders FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view proforma invoices" ON public.proforma_invoices FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Commercial finance HR admin manage proforma invoices" ON public.proforma_invoices FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin view bank statements" ON public.bank_statements FOR SELECT USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin manage bank statements" ON public.bank_statements FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin view bank transactions" ON public.bank_transactions FOR SELECT USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin manage bank transactions" ON public.bank_transactions FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin manage reconciliations" ON public.finance_reconciliations FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin manage HR workflow settings" ON public.hr_workflow_settings FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR finance admin manage salary schedules" ON public.hr_salary_schedules FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR finance admin manage overtime" ON public.hr_overtime_entries FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR finance admin manage staff loans" ON public.hr_staff_loans FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR finance admin manage loan repayments" ON public.hr_loan_repayments FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin manage external loans" ON public.hr_external_loans FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR admin manage HMO" ON public.hr_hmo_enrolments FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin manage VAT schedule" ON public.vat_schedule_entries FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));

-- HR may review leave and disciplinary records; only the configured MD may decide.
-- Direct UPDATE is removed so HR cannot modify the MD decision columns by bypassing the RPCs.
DROP POLICY IF EXISTS "HR/Admin can update leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "MD can decide leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "HR/Admin can update disciplinary records" ON public.disciplinary_records;
DROP POLICY IF EXISTS "HR/Admin can manage disciplinary" ON public.disciplinary_records;
DROP POLICY IF EXISTS "MD can decide disciplinary records" ON public.disciplinary_records;
CREATE POLICY "Members can view disciplinary records" ON public.disciplinary_records FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR/Admin can insert disciplinary records" ON public.disciplinary_records FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete disciplinary records" ON public.disciplinary_records FOR DELETE USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.review_leave_request(_org_id uuid, _leave_id uuid, _review_status text, _notes text DEFAULT NULL)
RETURNS public.leave_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_row public.leave_requests;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to review leave request'; END IF;
  IF _review_status NOT IN ('pending','reviewed','returned') THEN RAISE EXCEPTION 'Invalid HR review status'; END IF;
  UPDATE public.leave_requests SET hr_review_status = _review_status, hr_reviewed_by = auth.uid(), hr_reviewed_at = now(), reason = COALESCE(_notes, reason) WHERE id = _leave_id AND organization_id = _org_id RETURNING * INTO result_row;
  IF result_row.id IS NULL THEN RAISE EXCEPTION 'Leave request not found'; END IF;
  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_leave_request(_org_id uuid, _leave_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS public.leave_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_row public.leave_requests; approver_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.hr_workflow_settings s WHERE s.organization_id = _org_id AND s.md_approver_id = auth.uid()) INTO approver_ok;
  IF NOT (approver_ok OR has_org_role(auth.uid(), _org_id, 'administrator') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Only the configured MD may decide leave requests'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid MD decision'; END IF;
  UPDATE public.leave_requests SET md_decision = _decision, md_decided_by = auth.uid(), md_decided_at = now(), md_decision_reason = _reason, status = _decision, approved_by = auth.uid() WHERE id = _leave_id AND organization_id = _org_id AND hr_review_status = 'reviewed' RETURNING * INTO result_row;
  IF result_row.id IS NULL THEN RAISE EXCEPTION 'Leave request is not reviewed or was not found'; END IF;
  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_disciplinary_record(_org_id uuid, _record_id uuid, _review_status text)
RETURNS public.disciplinary_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_row public.disciplinary_records;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to review disciplinary record'; END IF;
  IF _review_status NOT IN ('pending','reviewed','returned') THEN RAISE EXCEPTION 'Invalid HR review status'; END IF;
  UPDATE public.disciplinary_records SET hr_review_status = _review_status WHERE id = _record_id AND organization_id = _org_id RETURNING * INTO result_row;
  IF result_row.id IS NULL THEN RAISE EXCEPTION 'Disciplinary record not found'; END IF;
  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_disciplinary_record(_org_id uuid, _record_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS public.disciplinary_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_row public.disciplinary_records; approver_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.hr_workflow_settings s WHERE s.organization_id = _org_id AND s.md_approver_id = auth.uid()) INTO approver_ok;
  IF NOT (approver_ok OR has_org_role(auth.uid(), _org_id, 'administrator') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Only the configured MD may decide disciplinary records'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid MD decision'; END IF;
  UPDATE public.disciplinary_records SET md_decision = _decision, md_decided_by = auth.uid(), md_decided_at = now(), md_decision_reason = _reason WHERE id = _record_id AND organization_id = _org_id AND hr_review_status = 'reviewed' RETURNING * INTO result_row;
  IF result_row.id IS NULL THEN RAISE EXCEPTION 'Disciplinary record is not reviewed or was not found'; END IF;
  RETURN result_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_leave_request(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_leave_request(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_disciplinary_record(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_disciplinary_record(uuid, uuid, text, text) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_accounts, public.document_attachments, public.client_purchase_orders, public.proforma_invoices, public.bank_statements, public.bank_transactions, public.finance_reconciliations, public.hr_workflow_settings, public.hr_salary_schedules, public.hr_overtime_entries, public.hr_staff_loans, public.hr_loan_repayments, public.hr_external_loans, public.hr_hmo_enrolments, public.vat_schedule_entries TO authenticated;
GRANT ALL ON public.finance_accounts, public.document_attachments, public.client_purchase_orders, public.proforma_invoices, public.bank_statements, public.bank_transactions, public.finance_reconciliations, public.hr_workflow_settings, public.hr_salary_schedules, public.hr_overtime_entries, public.hr_staff_loans, public.hr_loan_repayments, public.hr_external_loans, public.hr_hmo_enrolments, public.vat_schedule_entries TO service_role;


CREATE OR REPLACE FUNCTION public.approve_salary_schedule(_org_id uuid, _schedule_id uuid)
RETURNS public.hr_salary_schedules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_row public.hr_salary_schedules;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to approve salary schedule'; END IF;
  UPDATE public.hr_salary_schedules SET status = 'approved', approved_by = auth.uid(), approved_at = now() WHERE id = _schedule_id AND organization_id = _org_id AND status = 'submitted' RETURNING * INTO result_row;
  IF result_row.id IS NULL THEN RAISE EXCEPTION 'Salary schedule is not submitted or was not found'; END IF;
  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_worker_payment_from_salary_schedule(_org_id uuid, _schedule_id uuid)
RETURNS public.worker_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE schedule_row public.hr_salary_schedules; payment_row public.worker_payments;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to pay salary schedule'; END IF;
  SELECT * INTO schedule_row FROM public.hr_salary_schedules WHERE id = _schedule_id AND organization_id = _org_id FOR UPDATE;
  IF schedule_row.id IS NULL OR schedule_row.status <> 'approved' THEN RAISE EXCEPTION 'Salary schedule must be approved before payment'; END IF;
  IF schedule_row.payment_id IS NOT NULL THEN SELECT * INTO payment_row FROM public.worker_payments WHERE id = schedule_row.payment_id; RETURN payment_row; END IF;
  INSERT INTO public.worker_payments (organization_id, user_id, type, amount, description, date, created_by, bank_account_id) VALUES (_org_id, schedule_row.employee_id, 'salary', schedule_row.net_pay, format('Salary schedule %s to %s', schedule_row.period_start, schedule_row.period_end), current_date, auth.uid(), schedule_row.bank_account_id) RETURNING * INTO payment_row;
  UPDATE public.hr_salary_schedules SET status = 'paid', payment_id = payment_row.id WHERE id = schedule_row.id;
  RETURN payment_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_overtime_entry(_org_id uuid, _entry_id uuid)
RETURNS public.hr_overtime_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_row public.hr_overtime_entries;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN RAISE EXCEPTION 'Not authorized to approve overtime'; END IF;
  UPDATE public.hr_overtime_entries SET status = 'approved', approved_by = auth.uid() WHERE id = _entry_id AND organization_id = _org_id AND status = 'submitted' RETURNING * INTO result_row;
  IF result_row.id IS NULL THEN RAISE EXCEPTION 'Overtime is not submitted or was not found'; END IF;
  RETURN result_row;
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
  INSERT INTO public.worker_payments (organization_id, user_id, type, amount, description, date, created_by, bank_account_id) VALUES (_org_id, entry_row.employee_id, 'overtime', entry_row.overtime_earnings, format('Overtime %s', entry_row.period_month), current_date, auth.uid(), entry_row.bank_account_id) RETURNING * INTO payment_row;
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
  INSERT INTO public.worker_payments (organization_id, user_id, type, amount, description, date, created_by, bank_account_id) VALUES (_org_id, loan_row.employee_id, 'salary', _amount, format('Staff loan repayment for loan %s', loan_row.id), _payment_date, auth.uid(), loan_row.bank_account_id) RETURNING id INTO repayment_row.payment_id;
  INSERT INTO public.hr_loan_repayments (organization_id, loan_id, amount, payment_date, payment_id, recorded_by, notes) VALUES (_org_id, _loan_id, _amount, _payment_date, repayment_row.payment_id, auth.uid(), _notes) RETURNING * INTO repayment_row;
  new_balance := GREATEST(0, loan_row.outstanding_balance - _amount);
  UPDATE public.hr_staff_loans SET payments_made = payments_made + _amount, outstanding_balance = new_balance, status = CASE WHEN new_balance = 0 THEN 'completed' ELSE status END WHERE id = _loan_id;
  RETURN repayment_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_salary_schedule(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_worker_payment_from_salary_schedule(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_overtime_entry(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_worker_payment_from_overtime(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_staff_loan_repayment(uuid, uuid, numeric, date, text) TO authenticated;


CREATE TABLE IF NOT EXISTS public.director_account_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.finance_accounts(id) ON DELETE RESTRICT,
  entry_date date NOT NULL DEFAULT current_date,
  transaction_type text NOT NULL CHECK (transaction_type IN ('advance','repayment','expense','other')),
  amount numeric NOT NULL CHECK (amount >= 0),
  folio text,
  description text,
  payment_id uuid REFERENCES public.worker_payments(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.director_account_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance HR admin manage director account entries" ON public.director_account_entries FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS director_account_entries_date_idx ON public.director_account_entries(organization_id, account_id, entry_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.director_account_entries TO authenticated;
GRANT ALL ON public.director_account_entries TO service_role;


ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS procurement_mode text NOT NULL DEFAULT 'local' CHECK (procurement_mode IN ('local','import','forex','open_market')),
  ADD COLUMN IF NOT EXISTS vendor_invoice_number text,
  ADD COLUMN IF NOT EXISTS accounting_folio text,
  ADD COLUMN IF NOT EXISTS site_reference text,
  ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  ADD COLUMN IF NOT EXISTS haulage_cost numeric NOT NULL DEFAULT 0 CHECK (haulage_cost >= 0),
  ADD COLUMN IF NOT EXISTS exchange_rate numeric CHECK (exchange_rate IS NULL OR exchange_rate > 0),
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  ADD COLUMN IF NOT EXISTS outstanding_amount numeric NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partially_paid','paid'));

CREATE OR REPLACE FUNCTION public.create_purchase_order_with_metadata(
  _org_id uuid,
  _vendor_id uuid,
  _project_id uuid DEFAULT NULL,
  _delivery_date date DEFAULT NULL,
  _notes text DEFAULT NULL,
  _items jsonb DEFAULT '[]'::jsonb,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_po_id uuid; v_total numeric;
BEGIN
  v_po_id := public.create_purchase_order_with_items(_org_id, _vendor_id, _project_id, _delivery_date, _notes, _items);
  SELECT COALESCE(total_amount, 0) INTO v_total FROM public.purchase_orders WHERE id = v_po_id;
  UPDATE public.purchase_orders SET
    procurement_mode = COALESCE(NULLIF(_metadata->>'procurement_mode', ''), 'local'),
    vendor_invoice_number = NULLIF(_metadata->>'vendor_invoice_number', ''),
    accounting_folio = NULLIF(_metadata->>'accounting_folio', ''),
    site_reference = NULLIF(_metadata->>'site_reference', ''),
    vat_amount = COALESCE(NULLIF(_metadata->>'vat_amount', '')::numeric, 0),
    haulage_cost = COALESCE(NULLIF(_metadata->>'haulage_cost', '')::numeric, 0),
    exchange_rate = NULLIF(_metadata->>'exchange_rate', '')::numeric,
    amount_paid = COALESCE(NULLIF(_metadata->>'amount_paid', '')::numeric, 0),
    outstanding_amount = GREATEST(0, v_total + COALESCE(NULLIF(_metadata->>'vat_amount', '')::numeric, 0) + COALESCE(NULLIF(_metadata->>'haulage_cost', '')::numeric, 0) - COALESCE(NULLIF(_metadata->>'amount_paid', '')::numeric, 0)),
    payment_status = CASE WHEN COALESCE(NULLIF(_metadata->>'amount_paid', '')::numeric, 0) <= 0 THEN 'unpaid' WHEN COALESCE(NULLIF(_metadata->>'amount_paid', '')::numeric, 0) >= v_total + COALESCE(NULLIF(_metadata->>'vat_amount', '')::numeric, 0) + COALESCE(NULLIF(_metadata->>'haulage_cost', '')::numeric, 0) THEN 'paid' ELSE 'partially_paid' END
  WHERE id = v_po_id AND organization_id = _org_id;
  RETURN v_po_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_purchase_order_with_metadata(uuid, uuid, uuid, date, text, jsonb, jsonb) TO authenticated;


ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS withholding_tax_amount numeric NOT NULL DEFAULT 0 CHECK (withholding_tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partially_paid','paid'));


CREATE TABLE IF NOT EXISTS public.finance_transaction_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_transaction_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('invoice','receipt','expense','worker_payment','purchase_order','fuel_log','director_account','staff_loan','loan_repayment','salary_schedule','overtime','vat_entry','external_loan','transfer')),
  entity_id uuid NOT NULL,
  linked_amount numeric NOT NULL CHECK (linked_amount >= 0),
  linked_by uuid NOT NULL REFERENCES auth.users(id),
  linked_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE (organization_id, bank_transaction_id, entity_type, entity_id)
);
ALTER TABLE public.finance_transaction_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance HR admin view transaction links" ON public.finance_transaction_links FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance HR admin manage transaction links" ON public.finance_transaction_links FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transaction_links TO authenticated;
GRANT ALL ON public.finance_transaction_links TO service_role;

CREATE OR REPLACE FUNCTION public.review_bank_transaction(
  _org_id uuid,
  _transaction_id uuid,
  _status text,
  _category text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to review bank transactions';
  END IF;
  IF _status NOT IN ('suggested','approved','rejected') THEN RAISE EXCEPTION 'Invalid bank review status'; END IF;
  UPDATE public.bank_transactions SET review_status = _status, suggested_category = COALESCE(NULLIF(trim(_category), ''), suggested_category), reviewed_by = auth.uid(), reviewed_at = now(), review_notes = NULLIF(trim(_notes), '') WHERE id = _transaction_id AND organization_id = _org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank transaction not found in organization'; END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_bank_transaction(uuid, uuid, text, text, text) TO authenticated;

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
DECLARE v_link_id uuid; v_transaction public.bank_transactions%ROWTYPE;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to link bank transactions';
  END IF;
  IF _linked_amount < 0 THEN RAISE EXCEPTION 'Linked amount cannot be negative'; END IF;
  SELECT * INTO v_transaction FROM public.bank_transactions WHERE id = _transaction_id AND organization_id = _org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank transaction not found in organization'; END IF;
  IF v_transaction.review_status NOT IN ('approved','suggested','linked') THEN RAISE EXCEPTION 'Bank transaction must be approved before linking'; END IF;
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
  INSERT INTO public.finance_transaction_links (organization_id, bank_transaction_id, entity_type, entity_id, linked_amount, linked_by, notes) VALUES (_org_id, _transaction_id, _entity_type, _entity_id, _linked_amount, auth.uid(), NULLIF(trim(_notes), '')) ON CONFLICT (organization_id, bank_transaction_id, entity_type, entity_id) DO UPDATE SET linked_amount = EXCLUDED.linked_amount, linked_by = EXCLUDED.linked_by, linked_at = now(), notes = EXCLUDED.notes RETURNING id INTO v_link_id;
  UPDATE public.bank_transactions SET review_status = 'linked', reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _transaction_id AND organization_id = _org_id;
  RETURN v_link_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.link_bank_transaction(uuid, uuid, text, uuid, numeric, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.create_vat_schedule_entry(
  _org_id uuid,
  _entry_date date,
  _client_tin text,
  _client_name text,
  _gross_amount numeric,
  _output_vat numeric,
  _input_vat numeric,
  _withholding_tax numeric,
  _vat_withheld numeric,
  _vat_paid numeric,
  _penalty numeric,
  _interest numeric,
  _brought_forward numeric,
  _lrp numeric,
  _state text,
  _local_government text,
  _free_trade_zone boolean,
  _source_entity_type text,
  _source_entity_id uuid,
  _note text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid; v_net numeric; v_total numeric;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance') OR has_org_role(auth.uid(), _org_id, 'hr') OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to create VAT schedule entries';
  END IF;
  IF NULLIF(trim(_client_name), '') IS NULL THEN RAISE EXCEPTION 'Client name is required'; END IF;
  IF _gross_amount < 0 OR _output_vat < 0 OR _input_vat < 0 OR _withholding_tax < 0 OR _vat_withheld < 0 OR _vat_paid < 0 OR _penalty < 0 OR _interest < 0 OR _brought_forward < 0 OR _lrp < 0 THEN RAISE EXCEPTION 'VAT amounts cannot be negative'; END IF;
  v_net := round(greatest(0, _gross_amount - _vat_withheld), 2);
  v_total := round(_output_vat - _input_vat - _vat_withheld - _vat_paid + _penalty + _interest - _brought_forward - _lrp, 2);
  INSERT INTO public.vat_schedule_entries (organization_id, entry_date, client_tin, client_name, gross_amount, output_vat, input_vat, withholding_tax, net_amount, state, local_government, vat_withheld, free_trade_zone, vat_paid, vat_payable, vat_credit, penalty, interest, brought_forward, lrp, total_vat_credit_payable, source_entity_type, source_entity_id, note, created_by)
  VALUES (_org_id, _entry_date, NULLIF(trim(_client_tin), ''), trim(_client_name), round(_gross_amount, 2), round(_output_vat, 2), round(_input_vat, 2), round(_withholding_tax, 2), v_net, NULLIF(trim(_state), ''), NULLIF(trim(_local_government), ''), round(_vat_withheld, 2), COALESCE(_free_trade_zone, false), round(_vat_paid, 2), greatest(0, v_total), greatest(0, -v_total), round(_penalty, 2), round(_interest, 2), round(_brought_forward, 2), round(_lrp, 2), v_total, NULLIF(trim(_source_entity_type), ''), _source_entity_id, NULLIF(trim(_note), ''), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_vat_schedule_entry(uuid, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text, boolean, text, uuid, text) TO authenticated;


ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.worker_payments
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.hr_staff_loans
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.hr_hmo_enrolments
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.worker_payments(id) ON DELETE SET NULL;
ALTER TABLE public.fuel_logs
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.worker_payments(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS receipts_bank_account_idx ON public.receipts(organization_id, bank_account_id);
CREATE INDEX IF NOT EXISTS worker_payments_bank_account_idx ON public.worker_payments(organization_id, bank_account_id);
CREATE INDEX IF NOT EXISTS fuel_logs_account_idx ON public.fuel_logs(organization_id, account_id);
CREATE INDEX IF NOT EXISTS purchase_orders_bank_account_idx ON public.purchase_orders(organization_id, bank_account_id);


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
  IF _bank_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.finance_accounts WHERE id = _bank_account_id AND organization_id = _org_id AND is_active = true) THEN
    RAISE EXCEPTION 'Bank account not found or inactive in organization';
  END IF;
  v_receipt := public.record_invoice_payment(_org_id, _invoice_id, _amount, _payment_method, _reference_number, _notes, _payment_date);
  UPDATE public.receipts SET bank_account_id = _bank_account_id WHERE id = v_receipt.id AND organization_id = _org_id RETURNING * INTO v_receipt;
  RETURN v_receipt;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, uuid, numeric, text, text, text, date, uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.normalize_expense_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.amount, 0) < 0 OR COALESCE(NEW.part_payment, 0) < 0 THEN
    RAISE EXCEPTION 'Expense amount and part payment cannot be negative';
  END IF;
  NEW.outstanding_balance := round(greatest(0, COALESCE(NEW.amount, 0) - COALESCE(NEW.part_payment, 0)), 2);
  NEW.payment_status := CASE
    WHEN NEW.outstanding_balance > 0 AND COALESCE(NEW.part_payment, 0) > 0 THEN 'partially_paid'
    WHEN NEW.outstanding_balance > 0 THEN 'unpaid'
    ELSE 'paid'
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS normalize_expense_payment_fields_trigger ON public.expenses;
CREATE TRIGGER normalize_expense_payment_fields_trigger
BEFORE INSERT OR UPDATE OF amount, part_payment, outstanding_balance, payment_status ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.normalize_expense_payment_fields();