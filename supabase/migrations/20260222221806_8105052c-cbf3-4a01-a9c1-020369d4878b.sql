-- Fix: RLS enabled but no policies on system_maintenance_accounts
ALTER TABLE public.system_maintenance_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maintenance account can view self" ON public.system_maintenance_accounts;

CREATE POLICY "Maintenance account can view self"
ON public.system_maintenance_accounts
FOR SELECT
USING (auth.uid() = user_id);
