-- =============================================
-- ADD MISSING DELETE RLS POLICIES
-- =============================================
-- Add DELETE policies for performance_logs and leave_requests
-- These tables were missing DELETE policies according to the audit

-- DROP existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can delete performance_logs" ON public.performance_logs;
DROP POLICY IF EXISTS "Users can delete leave_requests" ON public.leave_requests;

-- CREATE DELETE policy for performance_logs
CREATE POLICY "Users can delete performance_logs"
ON public.performance_logs
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id FROM public.organization_memberships 
    WHERE user_id = auth.uid() AND organization_id = public.performance_logs.organization_id
    LIMIT 1
  )
);

-- CREATE DELETE policy for leave_requests
CREATE POLICY "Users can delete leave_requests"
ON public.leave_requests
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id FROM public.organization_memberships 
    WHERE user_id = auth.uid() AND organization_id = public.leave_requests.organization_id
    LIMIT 1
  )
  OR user_id = auth.uid()
);
