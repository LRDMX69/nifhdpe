-- =============================================
-- SETUP PG_CRON FOR AUTO-MODE
-- =============================================
-- This migration sets up a cron job to trigger the auto-mode-runner edge function
-- The cron job runs every 30 minutes to trigger automations for orgs with auto-mode enabled

-- Ensure pg_net extension is enabled for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any existing cron job with this name to avoid conflicts
SELECT cron.unschedule('auto-mode-runner') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-mode-runner'
);

-- Create the cron job
-- Note: This requires the PROJECT_REF and SERVICE_ROLE_KEY to be set as environment variables
-- or you need to replace the placeholders below with actual values
SELECT cron.schedule(
  'auto-mode-runner',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.project_url', true) || '/functions/v1/auto-mode-runner',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Set default values for the settings if they don't exist
-- These should be configured in Supabase dashboard under Edge Functions settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.project_url') THEN
    RAISE NOTICE 'Please set app.project_url in Supabase dashboard (Settings > Edge Functions)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.service_role_key') THEN
    RAISE NOTICE 'Please set app.service_role_key in Supabase dashboard (Settings > Edge Functions)';
  END IF;
END $$;

