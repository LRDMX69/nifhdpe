
-- =============================================
-- DROP ALL STALE TRIGGERS THEN RECREATE FRESH
-- =============================================

-- updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.clients;
DROP TRIGGER IF EXISTS set_updated_at ON public.deliveries;
DROP TRIGGER IF EXISTS set_updated_at ON public.equipment;
DROP TRIGGER IF EXISTS set_updated_at ON public.equipment_requests;
DROP TRIGGER IF EXISTS set_updated_at ON public.field_reports;
DROP TRIGGER IF EXISTS set_updated_at ON public.inventory;
DROP TRIGGER IF EXISTS set_updated_at ON public.knowledge_articles;
DROP TRIGGER IF EXISTS set_updated_at ON public.auto_mode_settings;
DROP TRIGGER IF EXISTS set_updated_at ON public.disciplinary_records;
DROP TRIGGER IF EXISTS set_updated_at ON public.employee_skills;
DROP TRIGGER IF EXISTS set_updated_at ON public.training_logs;
DROP TRIGGER IF EXISTS set_updated_at ON public.promotions;
DROP TRIGGER IF EXISTS set_updated_at ON public.learning_reflections;
DROP TRIGGER IF EXISTS set_updated_at ON public.recruitment;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.auto_mode_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.employee_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.training_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.learning_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recruitment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- audit triggers
DROP TRIGGER IF EXISTS audit_log ON public.inventory;
DROP TRIGGER IF EXISTS audit_log ON public.projects;
DROP TRIGGER IF EXISTS audit_log ON public.messages;
DROP TRIGGER IF EXISTS audit_log ON public.quotations;
DROP TRIGGER IF EXISTS audit_log ON public.clients;
DROP TRIGGER IF EXISTS audit_log ON public.deliveries;
DROP TRIGGER IF EXISTS audit_log ON public.equipment;
DROP TRIGGER IF EXISTS audit_log ON public.compliance_documents;
DROP TRIGGER IF EXISTS audit_log ON public.field_reports;
DROP TRIGGER IF EXISTS audit_log ON public.expenses;
DROP TRIGGER IF EXISTS audit_log ON public.leave_requests;
DROP TRIGGER IF EXISTS audit_log ON public.attendance;
DROP TRIGGER IF EXISTS audit_log ON public.opportunities;
DROP TRIGGER IF EXISTS audit_log ON public.knowledge_articles;
DROP TRIGGER IF EXISTS audit_log ON public.recruitment;
DROP TRIGGER IF EXISTS audit_log ON public.training_logs;
DROP TRIGGER IF EXISTS audit_log ON public.disciplinary_records;

CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.recruitment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.training_logs FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_log AFTER INSERT OR UPDATE OR DELETE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
