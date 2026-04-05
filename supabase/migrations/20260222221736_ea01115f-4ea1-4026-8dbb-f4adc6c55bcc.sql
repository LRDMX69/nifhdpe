-- Migration 1/2: add new roles (must be committed before use)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'app_role' AND n.nspname = 'public') THEN
    RAISE EXCEPTION 'public.app_role enum is missing';
  END IF;
END$$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'knowledge_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'siwes_trainee';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'it_student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nysc_member';
