
-- 1. Worker Claims: add file_url and uploaded_at
ALTER TABLE public.worker_claims ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.worker_claims ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;

-- 2. Projects: add GPS coordinates for site check-in
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_lat numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_lng numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS radius_meters integer DEFAULT 500;

-- 3. Storage bucket for claim attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-attachments', 'claim-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for claim-attachments
CREATE POLICY "Members can upload claim attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'claim-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Members can view claim attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'claim-attachments' AND auth.uid() IS NOT NULL);

-- 4. Recreate triggers (safe with IF NOT EXISTS pattern)
-- updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_at_worker_claims') THEN
    CREATE TRIGGER trg_updated_at_worker_claims BEFORE UPDATE ON public.worker_claims
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_at_projects') THEN
    CREATE TRIGGER trg_updated_at_projects BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Audit triggers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_worker_claims') THEN
    CREATE TRIGGER trg_audit_worker_claims AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_projects') THEN
    CREATE TRIGGER trg_audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
  END IF;
END $$;

-- Ensure all other critical triggers exist
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['attendance','clients','compliance_documents','deliveries','disciplinary_records','employee_skills','equipment','equipment_requests','expenses','field_reports','holidays','inventory','knowledge_articles','learning_reflections','leave_requests','messages','opportunities','organization_memberships','performance_logs','print_requests','profiles','quotations','recruitment','training_logs','storage_locations','storage_boxes']
  LOOP
    -- updated_at trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_at_' || tbl) THEN
      BEGIN
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', 'trg_updated_at_' || tbl, tbl);
      EXCEPTION WHEN others THEN NULL;
      END;
    END IF;
    -- audit trigger  
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_' || tbl) THEN
      BEGIN
        EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()', 'trg_audit_' || tbl, tbl);
      EXCEPTION WHEN others THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- Role enforcement trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_max_roles') THEN
    CREATE TRIGGER trg_enforce_max_roles BEFORE INSERT ON public.organization_memberships
    FOR EACH ROW EXECUTE FUNCTION public.enforce_max_roles();
  END IF;
END $$;
