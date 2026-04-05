
-- ============================================
-- AUDIT TRIGGERS on all tables with organization_id
-- ============================================

CREATE OR REPLACE TRIGGER audit_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_quotations
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_deliveries
  AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_compliance_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_worker_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_worker_claims
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_equipment
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_field_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.field_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_opportunities
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_messages
  AFTER INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================
-- UPDATED_AT TRIGGERS on all tables with updated_at column
-- ============================================

CREATE OR REPLACE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_inventory
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_quotations
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_deliveries
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_equipment
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_equipment_requests
  BEFORE UPDATE ON public.equipment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_field_reports
  BEFORE UPDATE ON public.field_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_opportunities
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_print_requests
  BEFORE UPDATE ON public.print_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_worker_claims
  BEFORE UPDATE ON public.worker_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_auto_mode_settings
  BEFORE UPDATE ON public.auto_mode_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_knowledge_articles
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
