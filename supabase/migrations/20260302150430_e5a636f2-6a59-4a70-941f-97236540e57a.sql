
-- ============================================================
-- PHASE 1: DATABASE FOUNDATION
-- ============================================================

-- 1.1 UPDATED_AT TRIGGERS (14 total)
-- Tables with updated_at: clients, compliance_documents, deliveries, equipment, 
-- equipment_requests, field_reports, inventory, knowledge_articles, opportunities,
-- print_requests, profiles, projects, quotations, worker_claims

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_compliance_documents_updated_at BEFORE UPDATE ON public.compliance_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_equipment_updated_at BEFORE UPDATE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_equipment_requests_updated_at BEFORE UPDATE ON public.equipment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_field_reports_updated_at BEFORE UPDATE ON public.field_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_knowledge_articles_updated_at BEFORE UPDATE ON public.knowledge_articles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_print_requests_updated_at BEFORE UPDATE ON public.print_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_worker_claims_updated_at BEFORE UPDATE ON public.worker_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 1.1b AUDIT TRIGGERS (17 total - for tables with organization_id)
CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_compliance_documents AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_deliveries AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_equipment AFTER INSERT OR UPDATE OR DELETE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_equipment_requests AFTER INSERT OR UPDATE OR DELETE ON public.equipment_requests
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_field_reports AFTER INSERT OR UPDATE OR DELETE ON public.field_reports
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_knowledge_articles AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_articles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_messages AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_opportunities AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_print_requests AFTER INSERT OR UPDATE OR DELETE ON public.print_requests
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_quotations AFTER INSERT OR UPDATE OR DELETE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_worker_claims AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_worker_payments AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 1.2 HR EXPANSION TABLES
-- ============================================================

-- Recruitment tracking
CREATE TABLE public.recruitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  position_title text NOT NULL,
  department text,
  status text NOT NULL DEFAULT 'open',
  candidate_name text,
  candidate_email text,
  candidate_phone text,
  resume_url text,
  interview_date date,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recruitment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin can manage recruitment" ON public.recruitment FOR ALL
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view recruitment" ON public.recruitment FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE TRIGGER trg_recruitment_updated_at BEFORE UPDATE ON public.recruitment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_audit_recruitment AFTER INSERT OR UPDATE OR DELETE ON public.recruitment
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Training logs
CREATE TABLE public.training_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  training_title text NOT NULL,
  training_type text DEFAULT 'internal',
  completed_date date,
  certificate_url text,
  score numeric,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin can manage training" ON public.training_logs FOR ALL
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view own training" ON public.training_logs FOR SELECT
  USING (user_id = auth.uid() OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE TRIGGER trg_training_logs_updated_at BEFORE UPDATE ON public.training_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_audit_training_logs AFTER INSERT OR UPDATE OR DELETE ON public.training_logs
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Disciplinary records
CREATE TABLE public.disciplinary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  severity text NOT NULL DEFAULT 'warning',
  description text NOT NULL,
  action_taken text,
  issued_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin can manage disciplinary" ON public.disciplinary_records FOR ALL
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE TRIGGER trg_disciplinary_updated_at BEFORE UPDATE ON public.disciplinary_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_audit_disciplinary AFTER INSERT OR UPDATE OR DELETE ON public.disciplinary_records
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Employee skills
CREATE TABLE public.employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  skill_name text NOT NULL,
  proficiency_level integer NOT NULL DEFAULT 1,
  certified boolean DEFAULT false,
  certification_expiry date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin can manage skills" ON public.employee_skills FOR ALL
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view own skills" ON public.employee_skills FOR SELECT
  USING (user_id = auth.uid() OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE TRIGGER trg_employee_skills_updated_at BEFORE UPDATE ON public.employee_skills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_audit_employee_skills AFTER INSERT OR UPDATE OR DELETE ON public.employee_skills
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Promotions
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  previous_role text,
  new_role text NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  approved_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin can manage promotions" ON public.promotions FOR ALL
  USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view own promotions" ON public.promotions FOR SELECT
  USING (user_id = auth.uid() OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE TRIGGER trg_audit_promotions AFTER INSERT OR UPDATE OR DELETE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 1.3 TRAINEE LEARNING REFLECTIONS
-- ============================================================
CREATE TABLE public.learning_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  title text NOT NULL,
  reflection text NOT NULL,
  week_number integer,
  supervisor_feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainees can insert own reflections" ON public.learning_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Users can view reflections" ON public.learning_reflections FOR SELECT
  USING (user_id = auth.uid() OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR has_org_role(auth.uid(), organization_id, 'knowledge_manager'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Users can update own reflections" ON public.learning_reflections FOR UPDATE
  USING (user_id = auth.uid() OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));
CREATE TRIGGER trg_learning_reflections_updated_at BEFORE UPDATE ON public.learning_reflections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 1.4 DELIVERY GPS COLUMNS
-- ============================================================
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS destination_lat numeric,
  ADD COLUMN IF NOT EXISTS destination_lng numeric,
  ADD COLUMN IF NOT EXISTS destination_state text,
  ADD COLUMN IF NOT EXISTS site_name text,
  ADD COLUMN IF NOT EXISTS delivered_lat numeric,
  ADD COLUMN IF NOT EXISTS delivered_lng numeric,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- ============================================================
-- 1.5 PROJECT LEADERSHIP COLUMNS
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_head_id uuid,
  ADD COLUMN IF NOT EXISTS team_member_ids jsonb DEFAULT '[]'::jsonb;

-- Add moderation_status to messages for AI moderation workflow
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending';
