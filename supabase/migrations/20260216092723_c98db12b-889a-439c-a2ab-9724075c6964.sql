
-- Print request workflow table
CREATE TABLE public.print_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  requested_by uuid NOT NULL,
  document_type text NOT NULL DEFAULT 'report',
  document_id uuid,
  document_title text NOT NULL,
  document_content text,
  stamp_type text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.print_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their own requests
CREATE POLICY "Users can view own print requests"
  ON public.print_requests FOR SELECT
  USING (requested_by = auth.uid() OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role) OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));

-- Any member can create print requests
CREATE POLICY "Members can create print requests"
  ON public.print_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by AND is_member_of_org(auth.uid(), organization_id));

-- Receptionist/Admin can approve
CREATE POLICY "Receptionist/Admin can update print requests"
  ON public.print_requests FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role) OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));

-- Central AI intelligence logs (invisible to regular users, admin-only read)
CREATE TABLE public.ai_intelligence_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  details text,
  source_table text,
  source_id uuid,
  metadata jsonb,
  is_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_intelligence_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can view intelligence logs
CREATE POLICY "Admin can view intelligence logs"
  ON public.ai_intelligence_logs FOR SELECT
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));

-- System (service role via edge functions) inserts - allow members for edge function context
CREATE POLICY "System can insert intelligence logs"
  ON public.ai_intelligence_logs FOR INSERT
  WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- Admin can mark as reviewed
CREATE POLICY "Admin can update intelligence logs"
  ON public.ai_intelligence_logs FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));

-- Add context_type and context_id indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_context ON public.messages(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_ai_intelligence_logs_org ON public.ai_intelligence_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_requests_org ON public.print_requests(organization_id, status);
