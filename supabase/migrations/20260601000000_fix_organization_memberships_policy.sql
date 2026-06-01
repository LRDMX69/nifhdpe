
-- Fix critical vulnerability: remove auth.uid() = user_id clause from INSERT policy
-- This prevents any authenticated user from granting themselves any role in any organization

DROP POLICY IF EXISTS "Admins can insert memberships" ON public.organization_memberships;

CREATE POLICY "Admins can insert memberships" ON public.organization_memberships FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
