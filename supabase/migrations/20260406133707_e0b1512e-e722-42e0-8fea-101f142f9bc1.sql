
-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_field_reports_updated_at
  BEFORE UPDATE ON public.field_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_compliance_documents_updated_at
  BEFORE UPDATE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_worker_claims_updated_at
  BEFORE UPDATE ON public.worker_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_recruitment_updated_at
  BEFORE UPDATE ON public.recruitment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_training_logs_updated_at
  BEFORE UPDATE ON public.training_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_employee_skills_updated_at
  BEFORE UPDATE ON public.employee_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_disciplinary_records_updated_at
  BEFORE UPDATE ON public.disciplinary_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_print_requests_updated_at
  BEFORE UPDATE ON public.print_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- TRIGGERS: audit logging (INSERT, UPDATE, DELETE)
-- ============================================================

CREATE TRIGGER trg_clients_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_inventory_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_quotations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_equipment_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_deliveries_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_field_reports_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.field_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_compliance_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_opportunities_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_worker_claims_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_recruitment_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.recruitment
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_training_logs_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.training_logs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_employee_skills_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_skills
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_disciplinary_records_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.disciplinary_records
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_promotions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_messages_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER trg_worker_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- TRIGGER: enforce max 2 roles per user per org
-- ============================================================

CREATE TRIGGER trg_enforce_max_roles
  BEFORE INSERT ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_roles();
