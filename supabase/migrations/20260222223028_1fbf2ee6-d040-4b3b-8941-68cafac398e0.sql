
-- Drop existing triggers first, then recreate all

-- UPDATED_AT triggers
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_deliveries_updated_at ON public.deliveries;
DROP TRIGGER IF EXISTS update_equipment_updated_at ON public.equipment;
DROP TRIGGER IF EXISTS update_equipment_requests_updated_at ON public.equipment_requests;
DROP TRIGGER IF EXISTS update_field_reports_updated_at ON public.field_reports;
DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
DROP TRIGGER IF EXISTS update_knowledge_articles_updated_at ON public.knowledge_articles;
DROP TRIGGER IF EXISTS update_opportunities_updated_at ON public.opportunities;
DROP TRIGGER IF EXISTS update_print_requests_updated_at ON public.print_requests;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
DROP TRIGGER IF EXISTS update_worker_claims_updated_at ON public.worker_claims;
DROP TRIGGER IF EXISTS update_auto_mode_settings_updated_at ON public.auto_mode_settings;

-- AUDIT triggers
DROP TRIGGER IF EXISTS audit_inventory ON public.inventory;
DROP TRIGGER IF EXISTS audit_clients ON public.clients;
DROP TRIGGER IF EXISTS audit_quotations ON public.quotations;
DROP TRIGGER IF EXISTS audit_quotation_items ON public.quotation_items;
DROP TRIGGER IF EXISTS audit_deliveries ON public.deliveries;
DROP TRIGGER IF EXISTS audit_projects ON public.projects;
DROP TRIGGER IF EXISTS audit_equipment ON public.equipment;
DROP TRIGGER IF EXISTS audit_compliance_documents ON public.compliance_documents;
DROP TRIGGER IF EXISTS audit_worker_claims ON public.worker_claims;
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
DROP TRIGGER IF EXISTS audit_worker_payments ON public.worker_payments;
DROP TRIGGER IF EXISTS audit_attendance ON public.attendance;
DROP TRIGGER IF EXISTS audit_messages ON public.messages;
DROP TRIGGER IF EXISTS audit_print_requests ON public.print_requests;
DROP TRIGGER IF EXISTS audit_field_reports ON public.field_reports;
DROP TRIGGER IF EXISTS audit_opportunities ON public.opportunities;
DROP TRIGGER IF EXISTS audit_knowledge_articles ON public.knowledge_articles;

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_equipment_requests_updated_at BEFORE UPDATE ON public.equipment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_field_reports_updated_at BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_knowledge_articles_updated_at BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_print_requests_updated_at BEFORE UPDATE ON public.print_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_worker_claims_updated_at BEFORE UPDATE ON public.worker_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_auto_mode_settings_updated_at BEFORE UPDATE ON public.auto_mode_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- AUDIT LOGGING TRIGGERS
-- =============================================
CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_quotations AFTER INSERT OR UPDATE OR DELETE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_quotation_items AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_deliveries AFTER INSERT OR UPDATE OR DELETE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_equipment AFTER INSERT OR UPDATE OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_compliance_documents AFTER INSERT OR UPDATE OR DELETE ON public.compliance_documents FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_worker_claims AFTER INSERT OR UPDATE OR DELETE ON public.worker_claims FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_worker_payments AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_messages AFTER INSERT OR UPDATE OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_print_requests AFTER INSERT OR UPDATE OR DELETE ON public.print_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_field_reports AFTER INSERT OR UPDATE OR DELETE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_opportunities AFTER INSERT OR UPDATE OR DELETE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_knowledge_articles AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- =============================================
-- KNOWLEDGE BASE RLS: Allow knowledge_manager role
-- =============================================
DROP POLICY IF EXISTS "Admin can insert knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/KM can insert knowledge articles" ON public.knowledge_articles
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'knowledge_manager'::app_role)
    OR is_maintenance_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admin can update knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/KM can update knowledge articles" ON public.knowledge_articles
  FOR UPDATE USING (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'knowledge_manager'::app_role)
    OR is_maintenance_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/KM can delete knowledge articles" ON public.knowledge_articles
  FOR DELETE USING (
    has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
    OR has_org_role(auth.uid(), organization_id, 'knowledge_manager'::app_role)
    OR is_maintenance_admin(auth.uid())
  );
