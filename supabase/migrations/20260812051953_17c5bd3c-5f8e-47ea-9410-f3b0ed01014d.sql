-- 000000 revoke anon grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- 000001 harden storage policies
DROP POLICY IF EXISTS "Anyone can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload claim attachments" ON storage.objects;

CREATE POLICY "Org members can view claim attachments" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'claim-attachments'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND is_member_of_org(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can upload claim attachments" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'claim-attachments'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND is_member_of_org(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can update their own claim attachments" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'claim-attachments'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own claim attachments" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'claim-attachments'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "Anyone can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload site photos" ON storage.objects;

CREATE POLICY "Org members can view site photos" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'site-photos'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (storage.foldername(name))[1]::uuid
        AND is_member_of_org(auth.uid(), p.organization_id)
    )
  );

CREATE POLICY "Users can upload site photos" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'site-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own site photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own site photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'site-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avatars bucket (private; org members may read, owner may write)
DROP POLICY IF EXISTS "Org members can view avatars" ON storage.objects;
CREATE POLICY "Org members can view avatars" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (storage.foldername(name))[1]::uuid
        AND (p.user_id = auth.uid() OR is_member_of_org(auth.uid(), p.organization_id))
    )
  );

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 000002 vendor bank details
REVOKE SELECT (bank_details) ON public.vendors FROM authenticated;

-- 000003 foreign key indexes
DO $$
DECLARE
  r record;
  idx_name text;
BEGIN
  FOR r IN
    SELECT tc.table_name::text AS table_name, kcu.column_name::text AS column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  LOOP
    idx_name := left(format('idx_%s_%s', r.table_name, r.column_name), 63);
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = r.table_name
        AND indexdef ILIKE '%' || quote_ident(r.column_name) || '%'
    ) THEN
      BEGIN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', idx_name, r.table_name, r.column_name);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- 000004 cleanup dead tables
DROP TABLE IF EXISTS public._mig_test;

-- 000005 fix cron jobs
CREATE OR REPLACE FUNCTION public._cron_default_org_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._cron_project_base_url() RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(NULLIF(current_setting('app.project_url', true), ''), 'https://pxuqddhgbkjwykeirkmz.supabase.co');
$$;

CREATE OR REPLACE FUNCTION public._cron_shared_secret() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.cron_shared_secret', true), ''),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_shared_secret' LIMIT 1),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public._cron_headers() RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public._cron_shared_secret());
$$;

SELECT cron.unschedule('attendance-auto-close-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-auto-close-daily');
SELECT cron.unschedule('auto-mode-runner-every-4h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-mode-runner-every-4h');
SELECT cron.unschedule('auto-mode-runner') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-mode-runner');
SELECT cron.unschedule('scan-opportunities-every-4h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-opportunities-every-4h');
SELECT cron.unschedule('central-ai-monitor-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'central-ai-monitor-daily');
SELECT cron.unschedule('daily-summary-all-orgs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-summary-all-orgs');
SELECT cron.unschedule('stock-analysis-all-orgs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stock-analysis-all-orgs');
SELECT cron.unschedule('hr-analysis-all-orgs-weekly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hr-analysis-all-orgs-weekly');
SELECT cron.unschedule('message-moderation-all-orgs-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'message-moderation-all-orgs-hourly');

SELECT cron.schedule('attendance-auto-close-daily', '55 23 * * *', $$ SELECT public.auto_close_open_attendance(); $$);

SELECT cron.schedule('auto-mode-runner-every-4h', '0 */4 * * *', $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/auto-mode-runner',
    headers := public._cron_headers(), body := '{}'::jsonb, timeout_milliseconds := 30000);
$$);

SELECT cron.schedule('scan-opportunities-every-4h', '0 */4 * * *', $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/opportunity-scanner',
    headers := public._cron_headers(), body := '{}'::jsonb, timeout_milliseconds := 30000);
$$);

SELECT cron.schedule('central-ai-monitor-daily', '0 8 * * *', $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/central-ai-monitor',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()), timeout_milliseconds := 30000);
$$);

SELECT cron.schedule('daily-summary-all-orgs', '0 7 * * *', $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/daily-summary',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()), timeout_milliseconds := 30000);
$$);

SELECT cron.schedule('stock-analysis-all-orgs', '0 6 * * *', $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/stock-analysis',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()), timeout_milliseconds := 30000);
$$);

SELECT cron.schedule('hr-analysis-all-orgs-weekly', '0 8 * * 1', $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/hr-analysis',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()), timeout_milliseconds := 30000);
$$);

SELECT cron.schedule('message-moderation-all-orgs-hourly', '0 * * * *', $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/message-moderation',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()), timeout_milliseconds := 30000);
$$);

REVOKE ALL ON FUNCTION public._cron_default_org_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._cron_project_base_url() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._cron_shared_secret() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._cron_headers() FROM PUBLIC, anon, authenticated;

-- 000006 role_assignment_requests (already exists live; ensure grants/policies)
CREATE TABLE IF NOT EXISTS public.role_assignment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_roles public.app_role[] NOT NULL DEFAULT ARRAY['technician'::public.app_role],
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_assignment_requests TO authenticated;
GRANT ALL ON public.role_assignment_requests TO service_role;

ALTER TABLE public.role_assignment_requests ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.admin_requests;

-- 000007 HR = head of finance
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
  OR (
    _role = 'finance'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = _user_id AND organization_id = _org_id AND role = 'hr'::public.app_role
    )
  );
$$;

-- 000008 finance audit + revision reasons
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS revision_reason TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS revision_reason TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS revision_reason TEXT;

CREATE OR REPLACE FUNCTION public.stash_revision_reason()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.revision_reason', COALESCE(NEW.revision_reason, ''), true);
  NEW.revision_reason := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stash_revision_reason ON public.invoices;
CREATE TRIGGER trg_stash_revision_reason BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.stash_revision_reason();

DROP TRIGGER IF EXISTS trg_stash_revision_reason ON public.quotations;
CREATE TRIGGER trg_stash_revision_reason BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.stash_revision_reason();

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reason TEXT := COALESCE(NULLIF(current_setting('app.revision_reason', true), ''), NULL);
  v_user uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (OLD.organization_id, v_user, TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data, revision_reason)
    VALUES (NEW.organization_id, v_user, TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_reason);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (NEW.organization_id, v_user, TG_OP, TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- invoice_items has no organization_id column: resolve it from the parent invoice.
CREATE OR REPLACE FUNCTION public.log_audit_event_invoice_items()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_org uuid;
  v_reason TEXT := COALESCE(NULLIF(current_setting('app.revision_reason', true), ''), NULL);
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT organization_id INTO v_org FROM public.invoices WHERE id = OLD.invoice_id;
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_org, v_user, TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  SELECT organization_id INTO v_org FROM public.invoices WHERE id = NEW.invoice_id;
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data, revision_reason)
    VALUES (v_org, v_user, TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_reason);
  ELSE
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_org, v_user, TG_OP, TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_invoice_items ON public.invoice_items;
CREATE TRIGGER trg_audit_invoice_items AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_invoice_items();

DROP TRIGGER IF EXISTS trg_audit_receipts ON public.receipts;
CREATE TRIGGER trg_audit_receipts AFTER INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP POLICY IF EXISTS "Finance-capable can view audit logs" ON public.audit_logs;
CREATE POLICY "Finance-capable can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    is_org_admin(auth.uid(), organization_id)
    OR has_org_role(auth.uid(), organization_id, 'finance'::public.app_role)
  );