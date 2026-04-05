
-- ===== MESSAGES TABLE =====
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sender_id uuid NOT NULL,
  recipient_id uuid,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  message_type text NOT NULL DEFAULT 'direct' CHECK (message_type IN ('direct', 'broadcast', 'context')),
  context_type text,
  context_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Sender can see own messages
CREATE POLICY "Users see own sent messages" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (message_type = 'broadcast' AND is_member_of_org(auth.uid(), organization_id))
    OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR is_maintenance_admin(auth.uid())
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id OR is_maintenance_admin(auth.uid())
  );

CREATE POLICY "Recipients can mark read" ON public.messages
  FOR UPDATE USING (
    recipient_id = auth.uid()
    OR (message_type = 'broadcast' AND is_member_of_org(auth.uid(), organization_id))
    OR is_maintenance_admin(auth.uid())
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ===== AUTO MODE SETTINGS TABLE =====
CREATE TABLE public.auto_mode_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_mode_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view auto mode" ON public.auto_mode_settings
  FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Admin can update auto mode" ON public.auto_mode_settings
  FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Admin can insert auto mode" ON public.auto_mode_settings
  FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));

-- ===== FIX ATTENDANCE RLS: Allow ALL workers to check in (not just HR/Admin) =====
DROP POLICY IF EXISTS "HR/Admin can insert attendance" ON public.attendance;
CREATE POLICY "Any member can check in" ON public.attendance
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND is_member_of_org(auth.uid(), organization_id))
    OR is_maintenance_admin(auth.uid())
  );

-- Allow users to update their own attendance (check-out)
DROP POLICY IF EXISTS "HR/Admin can update attendance" ON public.attendance;
CREATE POLICY "Users update own or HR/Admin updates all" ON public.attendance
  FOR UPDATE USING (
    (auth.uid() = user_id)
    OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'hr'::app_role)
    OR is_maintenance_admin(auth.uid())
  );
