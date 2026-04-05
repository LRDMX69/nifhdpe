
-- =============================================
-- CRITICAL FIX: Recreate ALL Database Triggers
-- =============================================
-- This migration ensures all triggers are properly created
-- Previous migrations attempted to create triggers but they failed
-- =============================================

-- First, ensure the trigger functions exist
-- These should already exist from previous migrations

-- updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      COALESCE(OLD.organization_id, NEW.organization_id),
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      COALESCE(OLD.organization_id, NEW.organization_id),
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      NEW.organization_id,
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Role enforcement function
CREATE OR REPLACE FUNCTION public.enforce_max_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.organization_memberships
      WHERE user_id = NEW.user_id AND organization_id = NEW.organization_id) >= 2 THEN
    RAISE EXCEPTION 'A user can have at most 2 roles per organization';
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================
-- DROP ANY EXISTING TRIGGERS (with various names)
-- =============================================

-- Drop updated_at triggers (with various naming patterns)
DROP TRIGGER IF EXISTS update_updated_at ON public.clients;
DROP TRIGGER IF EXISTS set_updated_at ON public.clients;
DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;

DROP TRIGGER IF EXISTS update_updated_at ON public.compliance_documents;
DROP TRIGGER IF EXISTS set_updated_at ON public.compliance_documents;
DROP TRIGGER IF EXISTS trg_compliance_documents_updated_at ON public.compliance_documents;

DROP TRIGGER IF EXISTS update_updated_at ON public.deliveries;
DROP TRIGGER IF EXISTS set_updated_at ON public.deliveries;
DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON public.deliveries;

DROP TRIGGER IF EXISTS update_updated_at ON public.equipment;
DROP TRIGGER IF EXISTS set_updated_at ON public.equipment;
DROP TRIGGER IF EXISTS trg_equipment_updated_at ON public.equipment;

DROP TRIGGER IF EXISTS update_updated_at ON public.equipment_requests;
DROP TRIGGER IF EXISTS set_updated_at ON public.equipment_requests;
DROP TRIGGER IF EXISTS trg_equipment_requests_updated_at ON public.equipment_requests;

DROP TRIGGER IF EXISTS update_updated_at ON public.field_reports;
DROP TRIGGER IF EXISTS set_updated_at ON public.field_reports;
DROP TRIGGER IF EXISTS trg_field_reports_updated_at ON public.field_reports;

DROP TRIGGER IF EXISTS update_updated_at ON public.inventory;
DROP TRIGGER IF EXISTS set_updated_at ON public.inventory;
DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;

DROP TRIGGER IF EXISTS update_updated_at ON public.knowledge_articles;
DROP TRIGGER IF EXISTS set_updated_at ON public.knowledge_articles;
DROP TRIGGER IF EXISTS trg_knowledge_articles_updated_at ON public.knowledge_articles;

DROP TRIGGER IF EXISTS update_updated_at ON public.learning_reflections;
DROP TRIGGER IF EXISTS set_updated_at ON public.learning_reflections;
DROP TRIGGER IF EXISTS trg_learning_reflections_updated_at ON public.learning_reflections;

DROP TRIGGER IF EXISTS update_updated_at ON public.opportunities;
DROP TRIGGER IF EXISTS set_updated_at ON public.opportunities;
DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON public.opportunities;

DROP TRIGGER IF EXISTS update_updated_at ON public.print_requests;
DROP TRIGGER IF EXISTS set_updated_at ON public.print_requests;
DROP TRIGGER IF EXISTS trg_print_requests_updated_at ON public.print_requests;

DROP TRIGGER IF EXISTS update_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;

DROP TRIGGER IF EXISTS update_updated_at ON public.projects;
DROP TRIGGER IF EXISTS set_updated_at ON public.projects;
DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;

DROP TRIGGER IF EXISTS update_updated_at ON public.quotations;
DROP TRIGGER IF EXISTS set_updated_at ON public.quotations;
DROP TRIGGER IF EXISTS trg_quotations_updated_at ON public.quotations;

DROP TRIGGER IF EXISTS update_updated_at ON public.worker_claims;
DROP TRIGGER IF EXISTS set_updated_at ON public.worker_claims;
DROP TRIGGER IF EXISTS trg_worker_claims_updated_at ON public.worker_claims;

DROP TRIGGER IF EXISTS update_updated_at ON public.auto_mode_settings;
DROP TRIGGER IF EXISTS set_updated_at ON public.auto_mode_settings;
DROP TRIGGER IF EXISTS trg_auto_mode_settings_updated_at ON public.auto_mode_settings;

DROP TRIGGER IF EXISTS update_updated_at ON public.disciplinary_records;
DROP TRIGGER IF EXISTS set_updated_at ON public.disciplinary_records;
DROP TRIGGER IF EXISTS trg_disciplinary_updated_at ON public.disciplinary_records;

DROP TRIGGER IF EXISTS update_updated_at ON public.employee_skills;
DROP TRIGGER IF EXISTS set_updated_at ON public.employee_skills;
DROP TRIGGER IF EXISTS trg_employee_skills_updated_at ON public.employee_skills;

DROP TRIGGER IF EXISTS update_updated_at ON public.training_logs;
DROP TRIGGER IF EXISTS set_updated_at ON public.training_logs;
DROP TRIGGER IF EXISTS trg_training_logs_updated_at ON public.training_logs;

DROP TRIGGER IF EXISTS update_updated_at ON public.promotions;
DROP TRIGGER IF EXISTS set_updated_at ON public.promotions;
DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;

DROP TRIGGER IF EXISTS update_updated_at ON public.recruitment;
DROP TRIGGER IF EXISTS set_updated_at ON public.recruitment;
DROP TRIGGER IF EXISTS trg_recruitment_updated_at ON public.recruitment;

-- Drop audit triggers (with various naming patterns)
DROP TRIGGER IF EXISTS audit_log ON public.inventory;
DROP TRIGGER IF EXISTS audit_inventory ON public.inventory;
DROP TRIGGER IF EXISTS trg_audit_inventory ON public.inventory;

DROP TRIGGER IF EXISTS audit_log ON public.projects;
DROP TRIGGER IF EXISTS audit_projects ON public.projects;
DROP TRIGGER IF EXISTS trg_audit_projects ON public.projects;

DROP TRIGGER IF EXISTS audit_log ON public.messages;
DROP TRIGGER IF EXISTS audit_messages ON public.messages;
DROP TRIGGER IF EXISTS trg_audit_messages ON public.messages;

DROP TRIGGER IF EXISTS audit_log ON public.quotations;
DROP TRIGGER IF EXISTS audit_quotations ON public.quotations;
DROP TRIGGER IF EXISTS trg_audit_quotations ON public.quotations;

DROP TRIGGER IF EXISTS audit_log ON public.quotation_items;
DROP TRIGGER IF EXISTS audit_quotation_items ON public.quotation_items;
DROP TRIGGER IF EXISTS trg_audit_quotation_items ON public.quotation_items;

DROP TRIGGER IF EXISTS audit_log ON public.clients;
DROP TRIGGER IF EXISTS audit_clients ON public.clients;
DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;

DROP TRIGGER IF EXISTS audit_log ON public.deliveries;
DROP TRIGGER IF EXISTS audit_deliveries ON public.deliveries;
DROP TRIGGER IF EXISTS trg_audit_deliveries ON public.deliveries;

DROP TRIGGER IF EXISTS audit_log ON public.equipment;
DROP TRIGGER IF EXISTS audit_equipment ON public.equipment;
DROP TRIGGER IF EXISTS trg_audit_equipment ON public.equipment;

DROP TRIGGER IF EXISTS audit_log ON public.compliance_documents;
DROP TRIGGER IF EXISTS audit_compliance_documents ON public.compliance_documents;
DROP TRIGGER IF EXISTS trg_audit_compliance_documents ON public.compliance_documents;

DROP TRIGGER IF EXISTS audit_log ON public.worker_claims;
DROP TRIGGER IF EXISTS audit_worker_claims ON public.worker_claims;
DROP TRIGGER IF EXISTS trg_audit_worker_claims ON public.worker_claims;

DROP TRIGGER IF EXISTS audit_log ON public.expenses;
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;

DROP TRIGGER IF EXISTS audit_log ON public.worker_payments;
DROP TRIGGER IF EXISTS audit_worker_payments ON public.worker_payments;
DROP TRIGGER IF EXISTS trg_audit_worker_payments ON public.worker_payments;

DROP TRIGGER IF EXISTS audit_log ON public.attendance;
DROP TRIGGER IF EXISTS audit_attendance ON public.attendance;
DROP TRIGGER IF EXISTS trg_audit_attendance ON public.attendance;

DROP TRIGGER IF EXISTS audit_log ON public.opportunities;
DROP TRIGGER IF EXISTS audit_opportunities ON public.opportunities;
DROP TRIGGER IF EXISTS trg_audit_opportunities ON public.opportunities;

DROP TRIGGER IF EXISTS audit_log ON public.knowledge_articles;
DROP TRIGGER IF EXISTS audit_knowledge_articles ON public.knowledge_articles;
DROP TRIGGER IF EXISTS trg_audit_knowledge_articles ON public.knowledge_articles;

DROP TRIGGER IF EXISTS audit_log ON public.recruitment;
DROP TRIGGER IF EXISTS audit_recruitment ON public.recruitment;
DROP TRIGGER IF EXISTS trg_audit_recruitment ON public.recruitment;

DROP TRIGGER IF EXISTS audit_log ON public.training_logs;
DROP TRIGGER IF EXISTS audit_training_logs ON public.training_logs;
DROP TRIGGER IF EXISTS trg_audit_training_logs ON public.training_logs;

DROP TRIGGER IF EXISTS audit_log ON public.disciplinary_records;
DROP TRIGGER IF EXISTS audit_disciplinary_records ON public.disciplinary_records;
DROP TRIGGER IF EXISTS trg_audit_disciplinary ON public.disciplinary_records;

DROP TRIGGER IF EXISTS audit_log ON public.leave_requests;
DROP TRIGGER IF EXISTS audit_leave_requests ON public.leave_requests;
DROP TRIGGER IF EXISTS trg_audit_leave_requests ON public.leave_requests;

DROP TRIGGER IF EXISTS audit_log ON public.field_reports;
DROP TRIGGER IF EXISTS audit_field_reports ON public.field_reports;
DROP TRIGGER IF EXISTS trg_audit_field_reports ON public.field_reports;

DROP TRIGGER IF EXISTS audit_log ON public.equipment_requests;
DROP TRIGGER IF EXISTS audit_equipment_requests ON public.equipment_requests;
DROP TRIGGER IF EXISTS trg_audit_equipment_requests ON public.equipment_requests;

-- Drop constraint trigger
DROP TRIGGER IF EXISTS check_max_roles ON public.organization_memberships;
DROP TRIGGER IF EXISTS enforce_max_roles ON public.organization_memberships;
DROP TRIGGER IF EXISTS trg_check_max_roles ON public.organization_memberships;

-- =============================================
-- RECREATE ALL UPDATED_AT TRIGGERS (19 tables)
-- =============================================

CREATE TRIGGER trg_clients_updated_at 
  BEFORE UPDATE ON public.clients 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_compliance_documents_updated_at 
  BEFORE UPDATE ON public.compliance_documents 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_deliveries_updated_at 
  BEFORE UPDATE ON public.deliveries 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_equipment_updated_at 
  BEFORE UPDATE ON public.equipment 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_equipment_requests_updated_at 
  BEFORE UPDATE ON public.equipment_requests 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_field_reports_updated_at 
  BEFORE UPDATE ON public.field_reports 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_inventory_updated_at 
  BEFORE UPDATE ON public.inventory 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_knowledge_articles_updated_at 
  BEFORE UPDATE ON public.knowledge_articles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_learning_reflections_updated_at 
  BEFORE UPDATE ON public.learning_reflections 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_opportunities_updated_at 
  BEFORE UPDATE ON public.opportunities 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_print_requests_updated_at 
  BEFORE UPDATE ON public.print_requests 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_projects_updated_at 
  BEFORE UPDATE ON public.projects 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_quotations_updated_at 
  BEFORE UPDATE ON public.quotations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_worker_claims_updated_at 
  BEFORE UPDATE ON public.worker_claims 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_auto_mode_settings_updated_at 
  BEFORE UPDATE ON public.auto_mode_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_disciplinary_updated_at 
  BEFORE UPDATE ON public.disciplinary_records 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_employee_skills_updated_at 
  BEFORE UPDATE ON public.employee_skills 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_training_logs_updated_at 
  BEFORE UPDATE ON public.training_logs 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_promotions_updated_at 
  BEFORE UPDATE ON public.promotions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_recruitment_updated_at 
  BEFORE UPDATE ON public.recruitment 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- RECREATE ALL AUDIT TRIGGERS (21 tables)
-- =============================================

CREATE TRIGGER trg_audit_inventory 
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_projects 
  AFTER INSERT OR UPDATE OR DELETE ON public.projects 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_messages 
  AFTER INSERT OR UPDATE OR DELETE ON public.messages 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_quotations 
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_quotation_items 
  AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_clients 
  AFTER INSERT OR UPDATE OR DELETE ON public.clients 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_deliveries 
  AFTER INSERT OR UPDATE OR DELETE ON public.deliveries 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_equipment 
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_compliance_documents 
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_worker_claims 
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_expenses 
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_worker_payments 
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_attendance 
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_opportunities 
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_knowledge_articles 
  AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_articles 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_recruitment 
  AFTER INSERT OR UPDATE OR DELETE ON public.recruitment 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_training_logs 
  AFTER INSERT OR UPDATE OR DELETE ON public.training_logs 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_disciplinary_records 
  AFTER INSERT OR UPDATE OR DELETE ON public.disciplinary_records 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_leave_requests 
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_field_reports 
  AFTER INSERT OR UPDATE OR DELETE ON public.field_reports 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_audit_equipment_requests 
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment_requests 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- =============================================
-- RECREATE CONSTRAINT TRIGGER (1)
-- =============================================

CREATE TRIGGER trg_check_max_roles
  BEFORE INSERT ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_roles();

-- =============================================
-- VERIFICATION QUERIES (for manual verification after migration)
-- =============================================
-- Uncomment to verify triggers were created:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' 
-- ORDER BY event_object_table, trigger_name;
