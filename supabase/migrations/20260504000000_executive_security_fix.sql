
-- 1. Close privilege escalation hole in organization_memberships
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.organization_memberships;
CREATE POLICY "Admins can insert memberships" ON public.organization_memberships FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));

-- 2. Secure storage buckets (Make Private)
UPDATE storage.buckets SET public = false WHERE id IN ('site-photos', 'claim-attachments');

-- 3. Document Numbering System
CREATE TABLE IF NOT EXISTS public.document_sequences (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, doc_type)
);
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view/manage sequences" ON public.document_sequences
  FOR ALL TO authenticated USING (is_org_admin(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.get_next_doc_number(_org_id uuid, _doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seq record;
BEGIN
  -- Initialize sequence if it doesn't exist
  INSERT INTO public.document_sequences (organization_id, doc_type, prefix, current_value)
  VALUES (_org_id, _doc_type, UPPER(_doc_type) || '/' || TO_CHAR(now(), 'YYYY') || '/', 0)
  ON CONFLICT (organization_id, doc_type) DO NOTHING;

  -- Increment and return
  UPDATE public.document_sequences
  SET current_value = current_value + 1
  WHERE organization_id = _org_id AND doc_type = _doc_type
  RETURNING prefix, current_value INTO _seq;

  RETURN _seq.prefix || LPAD(_seq.current_value::text, 4, '0');
END;
$$;

-- 4. Period-Close Lock for Expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false;

-- Policy to block updates/deletes on closed expenses
DROP POLICY IF EXISTS "No edits on closed expenses" ON public.expenses;
CREATE POLICY "No edits on closed expenses" ON public.expenses
  FOR ALL
  TO authenticated
  USING (is_closed = false OR is_maintenance_admin(auth.uid()))
  WITH CHECK (is_closed = false OR is_maintenance_admin(auth.uid()));

-- 5. Infrastructure: Add document_number to core tables
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS document_number TEXT UNIQUE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS document_number TEXT UNIQUE;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS document_number TEXT UNIQUE;

-- Trigger to auto-assign document numbers on insert
CREATE OR REPLACE FUNCTION public.auto_assign_doc_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_number IS NULL THEN
    NEW.document_number := public.get_next_doc_number(NEW.organization_id, TG_TABLE_NAME);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_quotations_doc_num BEFORE INSERT ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
CREATE TRIGGER tr_expenses_doc_num BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
CREATE TRIGGER tr_field_reports_doc_num BEFORE INSERT ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
