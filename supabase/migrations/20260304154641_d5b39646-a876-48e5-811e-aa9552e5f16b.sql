
-- =============================================
-- CREATE ALL 31 TRIGGERS
-- Functions already exist: update_updated_at() and log_audit_event()
-- =============================================

-- Drop all existing triggers first to avoid conflicts
DO $$ 
DECLARE
  tbl TEXT;
  trg TEXT;
BEGIN
  FOR tbl, trg IN 
    SELECT event_object_table, trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trg, tbl);
  END LOOP;
END $$;

-- ============ 14 UPDATED_AT TRIGGERS ============
CREATE TRIGGER trg_updated_at_inventory BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_deliveries BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_equipment BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_quotations BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_field_reports BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_knowledge_articles BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_equipment_requests BEFORE UPDATE ON public.equipment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_print_requests BEFORE UPDATE ON public.print_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_worker_claims BEFORE UPDATE ON public.worker_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_learning_reflections BEFORE UPDATE ON public.learning_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_disciplinary_records BEFORE UPDATE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_employee_skills BEFORE UPDATE ON public.employee_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ 17 AUDIT TRIGGERS ============
CREATE TRIGGER trg_audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_deliveries AFTER INSERT OR UPDATE OR DELETE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_equipment AFTER INSERT OR UPDATE OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_quotations AFTER INSERT OR UPDATE OR DELETE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_messages AFTER INSERT OR UPDATE OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_field_reports AFTER INSERT OR UPDATE OR DELETE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_compliance_documents AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_opportunities AFTER INSERT OR UPDATE OR DELETE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_knowledge_articles AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_recruitment AFTER INSERT OR UPDATE OR DELETE ON public.recruitment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_training_logs AFTER INSERT OR UPDATE OR DELETE ON public.training_logs FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_worker_claims AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
