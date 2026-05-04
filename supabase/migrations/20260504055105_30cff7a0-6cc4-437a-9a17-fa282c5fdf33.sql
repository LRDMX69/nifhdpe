
-- ============================================================
-- Payroll statutory deduction columns
-- ============================================================
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS basic_salary NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS housing_allowance NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS other_allowances NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS pension_employee NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS pension_employer NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS nhf_deduction NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS paye_tax NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS other_deductions NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS gross_pay NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS net_pay NUMERIC DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS document_number TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS basic_salary NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS housing_allowance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS other_allowances NUMERIC DEFAULT 0;

-- ============================================================
-- Auto doc-number trigger (uses existing next_doc_number function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_assign_doc_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_number IS NULL THEN
    NEW.document_number := public.next_doc_number(NEW.organization_id, TG_TABLE_NAME);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_worker_payments_doc_num ON public.worker_payments;
CREATE TRIGGER tr_worker_payments_doc_num BEFORE INSERT ON public.worker_payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();

-- ============================================================
-- HSE incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hse_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID,
  type TEXT NOT NULL,
  location TEXT,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  reported_by UUID,
  document_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hse_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view hse incidents" ON public.hse_incidents;
CREATE POLICY "Members can view hse incidents" ON public.hse_incidents FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

DROP POLICY IF EXISTS "HR/Admin can manage hse incidents" ON public.hse_incidents;
CREATE POLICY "HR/Admin can manage hse incidents" ON public.hse_incidents FOR ALL
  USING (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'hr'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'engineer'::app_role)
    OR is_maintenance_admin(auth.uid())
  )
  WITH CHECK (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'hr'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'engineer'::app_role)
    OR is_maintenance_admin(auth.uid())
  );

DROP TRIGGER IF EXISTS tr_hse_incidents_doc_num ON public.hse_incidents;
CREATE TRIGGER tr_hse_incidents_doc_num BEFORE INSERT ON public.hse_incidents
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();

DROP TRIGGER IF EXISTS tr_hse_incidents_updated ON public.hse_incidents;
CREATE TRIGGER tr_hse_incidents_updated BEFORE UPDATE ON public.hse_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Maintenance alerts (returns upcoming/overdue maintenance)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_maintenance_alerts(_org_id uuid)
RETURNS TABLE (
  equipment_id uuid,
  equipment_name text,
  alert_type text,
  due_date date,
  days_overdue integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.name,
    'maintenance_due'::text,
    e.next_maintenance_date,
    (CURRENT_DATE - e.next_maintenance_date)::int
  FROM public.equipment e
  WHERE e.organization_id = _org_id
    AND e.next_maintenance_date IS NOT NULL
    AND e.next_maintenance_date <= CURRENT_DATE + INTERVAL '14 days'
  ORDER BY e.next_maintenance_date ASC;
$$;
