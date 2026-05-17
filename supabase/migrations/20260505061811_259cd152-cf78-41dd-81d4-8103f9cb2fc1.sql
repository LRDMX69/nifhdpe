-- Create push_subscriptions table for Web Push (referenced by src/lib/pushNotifications.ts)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  organization_id uuid NULL,
  endpoint text NOT NULL UNIQUE,
  keys jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id OR is_maintenance_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_maintenance_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view org subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can view org subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (
  organization_id IS NOT NULL AND (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR is_maintenance_admin(auth.uid())
  )
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org ON public.push_subscriptions(organization_id);

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();