-- 1. Close privilege-escalation hole on organization_memberships INSERT
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.organization_memberships;
CREATE POLICY "Admins can insert memberships"
ON public.organization_memberships
FOR INSERT
WITH CHECK (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR is_maintenance_admin(auth.uid())
);

-- 2. Document numbering sequences
CREATE TABLE IF NOT EXISTS public.document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  doc_type text NOT NULL,
  year int NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  last_number int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, doc_type, year)
);

ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sequences"
ON public.document_sequences FOR SELECT
USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Members can insert sequences"
ON public.document_sequences FOR INSERT
WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Members can update sequences"
ON public.document_sequences FOR UPDATE
USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_doc_number(_org_id uuid, _doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year int := EXTRACT(YEAR FROM now())::int;
  _next int;
BEGIN
  INSERT INTO public.document_sequences (organization_id, doc_type, year, last_number)
  VALUES (_org_id, _doc_type, _year, 1)
  ON CONFLICT (organization_id, doc_type, year)
  DO UPDATE SET last_number = public.document_sequences.last_number + 1,
                updated_at = now()
  RETURNING last_number INTO _next;
  RETURN upper(_doc_type) || '/' || _year::text || '/' || lpad(_next::text, 4, '0');
END;
$$;

-- 3. Period-close ledger for finance
CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  is_closed boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_year, period_month)
);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view periods"
ON public.accounting_periods FOR SELECT
USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Finance/Admin can manage periods"
ON public.accounting_periods FOR ALL
USING (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
  OR is_maintenance_admin(auth.uid())
)
WITH CHECK (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
  OR is_maintenance_admin(auth.uid())
);

CREATE OR REPLACE FUNCTION public.guard_closed_period_expenses()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _closed boolean;
  _check_date date;
  _org uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _check_date := OLD.date;
    _org := OLD.organization_id;
  ELSE
    _check_date := NEW.date;
    _org := NEW.organization_id;
  END IF;

  SELECT is_closed INTO _closed
  FROM public.accounting_periods
  WHERE organization_id = _org
    AND period_year = EXTRACT(YEAR FROM _check_date)::int
    AND period_month = EXTRACT(MONTH FROM _check_date)::int;

  IF COALESCE(_closed, false) AND NOT is_maintenance_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accounting period is closed; this entry cannot be modified';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS expenses_period_close_guard ON public.expenses;
CREATE TRIGGER expenses_period_close_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.guard_closed_period_expenses();

-- 4. AI usage tracking (for future per-org throttling)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid,
  function_name text NOT NULL,
  tokens_estimate int DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view ai usage"
ON public.ai_usage_logs FOR SELECT
USING (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR is_maintenance_admin(auth.uid())
);

CREATE POLICY "System can insert ai usage"
ON public.ai_usage_logs FOR INSERT
WITH CHECK (
  is_member_of_org(auth.uid(), organization_id)
  OR is_maintenance_admin(auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org_time
ON public.ai_usage_logs (organization_id, created_at DESC);