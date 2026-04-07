
-- 1. HOLIDAYS TABLE
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  is_extended boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view holidays" ON public.holidays FOR SELECT TO public
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "HR/Admin can manage holidays" ON public.holidays FOR ALL TO public
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));

-- 2. STORAGE LOCATIONS TABLE
CREATE TABLE public.storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view storage locations" ON public.storage_locations FOR SELECT TO public
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Warehouse/Admin can manage storage locations" ON public.storage_locations FOR ALL TO public
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR is_maintenance_admin(auth.uid()));

-- 3. STORAGE BOXES TABLE
CREATE TABLE public.storage_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  box_code text NOT NULL,
  location_id uuid NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.storage_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view storage boxes" ON public.storage_boxes FOR SELECT TO public
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Warehouse/Admin can manage storage boxes" ON public.storage_boxes FOR ALL TO public
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR is_maintenance_admin(auth.uid()));

-- 4. ADD LOCATION/BOX COLUMNS TO INVENTORY
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.storage_locations(id);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.storage_boxes(id);

-- 5. TRIGGERS for new tables
CREATE TRIGGER trg_audit_holidays AFTER INSERT OR UPDATE OR DELETE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_storage_locations AFTER INSERT OR UPDATE OR DELETE ON public.storage_locations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_storage_boxes AFTER INSERT OR UPDATE OR DELETE ON public.storage_boxes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
