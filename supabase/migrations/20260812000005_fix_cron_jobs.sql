-- ============================================================================
-- FIX SCHEDULED JOB AUTHENTICATION (C-01)
-- ============================================================================
-- Every HTTP-based cron job previously failed with HTTP 401
-- UNAUTHORIZED_INVALID_JWT_FORMAT because the Authorization header carried a
-- shared secret that is not a valid JWT while the edge functions had
-- verify_jwt = true at the platform gateway.
--
-- Fix (two halves, both deployed together):
--   1. supabase/config.toml sets verify_jwt = false on every cron-invoked
--      function, so the platform no longer rejects the credential. Each
--      function now authorizes the request itself via isCronOrServiceRequest.
--   2. This migration re-creates the jobs so they send the rotating
--      cron_shared_secret in the custom `x-cron-secret` header, sourced from
--      the Supabase vault (name 'cron_shared_secret') with a fallback to the
--      app.cron_shared_secret custom setting.
--
-- Deployment requirement: set the CRON_SHARED_SECRET edge-function secret to
-- the SAME value stored in vault under 'cron_shared_secret'. If the vault
-- secret is absent the header is empty and the functions will refuse the call
-- (fail closed) — no literal secret is embedded in this repository.
-- ============================================================================

-- Per-org jobs target the first-created organization. This matches the current
-- single-organization deployment and the behaviour opportunity-scanner already
-- implements internally; multi-organization fan-out is handled by
-- auto-mode-runner, which iterates auto_mode_settings.
CREATE OR REPLACE FUNCTION public._cron_default_org_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
$$;

-- Resolve the project URL the same way the original setup migration did, with
-- the project ref from config.toml as fallback.
CREATE OR REPLACE FUNCTION public._cron_project_base_url() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.project_url', true), ''),
    'https://pxuqddhgbkjwykeirkmz.supabase.co'
  );
$$;

-- Resolve the cron shared secret from vault, falling back to the custom app
-- setting. Both must match the CRON_SHARED_SECRET edge-function secret.
CREATE OR REPLACE FUNCTION public._cron_shared_secret() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.cron_shared_secret', true), ''),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_shared_secret' LIMIT 1),
    ''
  );
$$;

-- Helper to build the authenticated request headers for a function call.
CREATE OR REPLACE FUNCTION public._cron_headers() RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', public._cron_shared_secret()
  );
$$;

-- Remove the existing (broken) jobs so they can be re-created. Safe on any
-- database regardless of which subset of jobs already exists.
SELECT cron.unschedule('attendance-auto-close-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-auto-close-daily');
SELECT cron.unschedule('auto-mode-runner-every-4h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-mode-runner-every-4h');
SELECT cron.unschedule('auto-mode-runner') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-mode-runner');
SELECT cron.unschedule('scan-opportunities-every-4h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-opportunities-every-4h');
SELECT cron.unschedule('central-ai-monitor-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'central-ai-monitor-daily');
SELECT cron.unschedule('daily-summary-all-orgs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-summary-all-orgs');
SELECT cron.unschedule('stock-analysis-all-orgs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stock-analysis-all-orgs');
SELECT cron.unschedule('hr-analysis-all-orgs-weekly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hr-analysis-all-orgs-weekly');
SELECT cron.unschedule('message-moderation-all-orgs-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'message-moderation-all-orgs-hourly');

-- 1. Attendance auto-close (pure SQL, no HTTP) — was working; re-created to
--    keep the job set defined in one place.
SELECT cron.schedule(
  'attendance-auto-close-daily',
  '55 23 * * *',
  $$ SELECT public.auto_close_open_attendance(); $$
);

-- 2. Auto-mode runner (driver; fans out to central-ai-monitor,
--    message-moderation and department-automation per org).
SELECT cron.schedule(
  'auto-mode-runner-every-4h',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/auto-mode-runner',
    headers := public._cron_headers(),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- 3. Opportunity scanner (falls back to the first org when none is supplied).
SELECT cron.schedule(
  'scan-opportunities-every-4h',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/opportunity-scanner',
    headers := public._cron_headers(),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- 4. Central AI monitor (per org).
SELECT cron.schedule(
  'central-ai-monitor-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/central-ai-monitor',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()),
    timeout_milliseconds := 30000
  );
  $$
);

-- 5. Daily executive summary (per org).
SELECT cron.schedule(
  'daily-summary-all-orgs',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/daily-summary',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()),
    timeout_milliseconds := 30000
  );
  $$
);

-- 6. Stock analysis (per org).
SELECT cron.schedule(
  'stock-analysis-all-orgs',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/stock-analysis',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()),
    timeout_milliseconds := 30000
  );
  $$
);

-- 7. Weekly HR analysis (per org).
SELECT cron.schedule(
  'hr-analysis-all-orgs-weekly',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/hr-analysis',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()),
    timeout_milliseconds := 30000
  );
  $$
);

-- 8. Hourly message moderation (per org).
SELECT cron.schedule(
  'message-moderation-all-orgs-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := public._cron_project_base_url() || '/functions/v1/message-moderation',
    headers := public._cron_headers(),
    body := jsonb_build_object('organization_id', public._cron_default_org_id()),
    timeout_milliseconds := 30000
  );
  $$
);

-- ============================================================================
-- Harden the helpers: pg_cron executes them as the postgres role, but they
-- live in the public schema where PostgREST would otherwise expose them as
-- RPC endpoints — _cron_shared_secret() in particular must NEVER be callable
-- by application roles. Revoke execution from everyone except superusers.
-- ============================================================================
REVOKE ALL ON FUNCTION public._cron_default_org_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._cron_project_base_url() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._cron_shared_secret() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._cron_headers() FROM PUBLIC, anon, authenticated;
