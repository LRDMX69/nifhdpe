
-- =============================================
-- A. CREATE ALL 31 DATABASE TRIGGERS
-- =============================================

-- 14 updated_at triggers
DROP TRIGGER IF EXISTS trg_updated_at_clients ON public.clients;
CREATE TRIGGER trg_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_deliveries ON public.deliveries;
CREATE TRIGGER trg_updated_at_deliveries BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_equipment ON public.equipment;
CREATE TRIGGER trg_updated_at_equipment BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_equipment_requests ON public.equipment_requests;
CREATE TRIGGER trg_updated_at_equipment_requests BEFORE UPDATE ON public.equipment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_field_reports ON public.field_reports;
CREATE TRIGGER trg_updated_at_field_reports BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_inventory ON public.inventory;
CREATE TRIGGER trg_updated_at_inventory BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_knowledge_articles ON public.knowledge_articles;
CREATE TRIGGER trg_updated_at_knowledge_articles BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_auto_mode_settings ON public.auto_mode_settings;
CREATE TRIGGER trg_updated_at_auto_mode_settings BEFORE UPDATE ON public.auto_mode_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_disciplinary_records ON public.disciplinary_records;
CREATE TRIGGER trg_updated_at_disciplinary_records BEFORE UPDATE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_employee_skills ON public.employee_skills;
CREATE TRIGGER trg_updated_at_employee_skills BEFORE UPDATE ON public.employee_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_training_logs ON public.training_logs;
CREATE TRIGGER trg_updated_at_training_logs BEFORE UPDATE ON public.training_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_promotions ON public.promotions;
CREATE TRIGGER trg_updated_at_promotions BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_learning_reflections ON public.learning_reflections;
CREATE TRIGGER trg_updated_at_learning_reflections BEFORE UPDATE ON public.learning_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_print_requests ON public.print_requests;
CREATE TRIGGER trg_updated_at_print_requests BEFORE UPDATE ON public.print_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 17 audit triggers
DROP TRIGGER IF EXISTS trg_audit_inventory ON public.inventory;
CREATE TRIGGER trg_audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_projects ON public.projects;
CREATE TRIGGER trg_audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_messages ON public.messages;
CREATE TRIGGER trg_audit_messages AFTER INSERT OR UPDATE OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_quotations ON public.quotations;
CREATE TRIGGER trg_audit_quotations AFTER INSERT OR UPDATE OR DELETE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;
CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_deliveries ON public.deliveries;
CREATE TRIGGER trg_audit_deliveries AFTER INSERT OR UPDATE OR DELETE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_equipment ON public.equipment;
CREATE TRIGGER trg_audit_equipment AFTER INSERT OR UPDATE OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_compliance_documents ON public.compliance_documents;
CREATE TRIGGER trg_audit_compliance_documents AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_field_reports ON public.field_reports;
CREATE TRIGGER trg_audit_field_reports AFTER INSERT OR UPDATE OR DELETE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_leave_requests ON public.leave_requests;
CREATE TRIGGER trg_audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_attendance ON public.attendance;
CREATE TRIGGER trg_audit_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_opportunities ON public.opportunities;
CREATE TRIGGER trg_audit_opportunities AFTER INSERT OR UPDATE OR DELETE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_knowledge_articles ON public.knowledge_articles;
CREATE TRIGGER trg_audit_knowledge_articles AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_recruitment ON public.recruitment;
CREATE TRIGGER trg_audit_recruitment AFTER INSERT OR UPDATE OR DELETE ON public.recruitment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_training_logs ON public.training_logs;
CREATE TRIGGER trg_audit_training_logs AFTER INSERT OR UPDATE OR DELETE ON public.training_logs FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_disciplinary_records ON public.disciplinary_records;
CREATE TRIGGER trg_audit_disciplinary_records AFTER INSERT OR UPDATE OR DELETE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- =============================================
-- B. UPDATE worker_payments INSERT RLS for HR role
-- =============================================
DROP POLICY IF EXISTS "Finance/Admin can insert worker payments" ON public.worker_payments;
CREATE POLICY "Finance/HR/Admin can insert worker payments"
  ON public.worker_payments FOR INSERT TO authenticated
  WITH CHECK (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'hr'::app_role)
    OR is_maintenance_admin(auth.uid())
  );
