
-- Fix message visibility: admin should NOT see direct messages between other users
-- Only sender, recipient, and broadcasts visible to org members
DROP POLICY IF EXISTS "Users see own sent messages" ON public.messages;

CREATE POLICY "Users see own messages and broadcasts"
ON public.messages
FOR SELECT
USING (
  (sender_id = auth.uid())
  OR (recipient_id = auth.uid())
  OR (message_type = 'broadcast' AND is_member_of_org(auth.uid(), organization_id))
  OR is_maintenance_admin(auth.uid())
);
