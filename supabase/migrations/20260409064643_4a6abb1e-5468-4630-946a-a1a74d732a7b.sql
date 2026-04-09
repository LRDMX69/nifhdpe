
-- Drop the overly permissive SELECT policy on field_reports
DROP POLICY IF EXISTS "Members can view field reports" ON public.field_reports;

-- Create strict SELECT policy: technicians see only own, others see all
CREATE POLICY "Role-based field report access" ON public.field_reports
FOR SELECT USING (
  -- Admins, engineers see all
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'engineer'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'hr'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
  OR is_maintenance_admin(auth.uid())
  -- Everyone else sees only their own
  OR (created_by = auth.uid())
);

-- Also fix worker_claims: non-admin/finance users should only see own claims
-- (Already correct based on existing policy, but let's ensure)
