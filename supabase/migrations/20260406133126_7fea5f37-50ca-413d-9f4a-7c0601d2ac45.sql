
-- Drop all existing triggers first to avoid conflicts
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.event_object_table);
  END LOOP;
END $$;

-- Create updated_at triggers for all tables with updated_at column
CREATE TRIGGER trg_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_deliveries BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_equipment BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_equipment_requests BEFORE UPDATE ON public.equipment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_field_reports BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_inventory BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_knowledge_articles BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_learning_reflections BEFORE UPDATE ON public.learning_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_opportunities BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_print_requests BEFORE UPDATE ON public.print_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_recruitment BEFORE UPDATE ON public.recruitment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_disciplinary_records BEFORE UPDATE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_employee_skills BEFORE UPDATE ON public.employee_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_worker_claims BEFORE UPDATE ON public.worker_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_auto_mode_settings BEFORE UPDATE ON public.auto_mode_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create audit log triggers for tables with organization_id
CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_deliveries AFTER INSERT OR UPDATE OR DELETE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_equipment AFTER INSERT OR UPDATE OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_field_reports AFTER INSERT OR UPDATE OR DELETE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_worker_payments AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_recruitment AFTER INSERT OR UPDATE OR DELETE ON public.recruitment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_training_logs AFTER INSERT OR UPDATE OR DELETE ON public.training_logs FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_disciplinary_records AFTER INSERT OR UPDATE OR DELETE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_promotions AFTER INSERT OR UPDATE OR DELETE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_performance_logs AFTER INSERT OR UPDATE OR DELETE ON public.performance_logs FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_compliance_documents AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_opportunities AFTER INSERT OR UPDATE OR DELETE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_worker_claims AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_audit_messages AFTER INSERT OR UPDATE OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
