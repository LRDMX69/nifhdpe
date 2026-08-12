-- ============================================================================
-- FIX MISSING ROLE ASSIGNMENT REQUEST TABLE
-- ============================================================================
-- role_assignment_requests is the table the sign-up flow, the settings
-- approval queue, the pending-approval detection and assign-pending-roles all
-- operate on, but it was NEVER created in any migration — it only existed in
-- the live database, created by hand. On a fresh deployment the
-- handle_new_user trigger (20260619000000) would INSERT into a missing table
-- and abort every account sign-up, because the trigger runs inside the
-- auth.users insert transaction.
--
-- This migration creates the table idempotently (matching the live schema as
-- inferred from every usage site) and drops the legacy admin_requests table,
-- which is now fully unreferenced by application code.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_assignment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_roles public.app_role[] NOT NULL DEFAULT ARRAY['technician'::public.app_role],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_assignment_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own pending/approved requests (the auth context and
-- pending-approval screen read these).
CREATE POLICY "Users can view their own role requests" ON public.role_assignment_requests
  FOR SELECT USING (user_id = auth.uid());

-- Administrators (or the hidden maintenance account) manage the org queue.
CREATE POLICY "Admins can view org role requests" ON public.role_assignment_requests
  FOR SELECT USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admins can update org role requests" ON public.role_assignment_requests
  FOR UPDATE USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admins can delete org role requests" ON public.role_assignment_requests
  FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- Users may record their own request (the sign-up trigger writes as the
-- postgres role via SECURITY DEFINER and is unaffected by RLS).
CREATE POLICY "Users can create their own role requests" ON public.role_assignment_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Legacy admin_requests: replaced by role_assignment_requests everywhere.
-- No application code reads or writes it after the AuthContext fix (H-08).
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.admin_requests;
