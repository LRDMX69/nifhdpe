-- Allow users to delete only their own direct/context messages.
-- Broadcasts remain admin/maintenance controlled and are not exposed by the
-- sender-side ChatView deletion control.

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE
  USING (
    (
      sender_id = auth.uid()
      AND message_type IN ('direct', 'context')
      AND is_member_of_org(auth.uid(), organization_id)
    )
    OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR is_maintenance_admin(auth.uid())
  );

COMMENT ON POLICY "Users can delete own messages" ON public.messages
IS 'Allows senders to delete their own direct/context messages within their organization; administrators and maintenance admins may delete for moderation.';