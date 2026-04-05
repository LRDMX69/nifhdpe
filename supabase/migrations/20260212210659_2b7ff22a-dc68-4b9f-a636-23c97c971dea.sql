
-- =============================================
-- Phase D: New tables for all new modules
-- =============================================

-- Equipment status enum
CREATE TYPE public.equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'retired');

-- Equipment log type enum
CREATE TYPE public.equipment_log_type AS ENUM ('assignment', 'maintenance', 'fault');

-- Compliance document status enum
CREATE TYPE public.compliance_status AS ENUM ('valid', 'expired', 'pending');

-- Opportunity status enum
CREATE TYPE public.opportunity_status AS ENUM ('identified', 'bidding', 'won', 'lost');

-- Expense category enum
CREATE TYPE public.expense_category AS ENUM ('labor', 'fuel', 'transport', 'materials', 'equipment', 'other');

-- =============================================
-- 1. field_reports
-- =============================================
CREATE TABLE public.field_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  crew_members TEXT,
  tasks_completed TEXT,
  notes TEXT,
  pressure_test_result TEXT,
  safety_incidents TEXT,
  client_feedback TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view field reports" ON public.field_reports FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Supervisor/Admin can insert field reports" ON public.field_reports FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'site_supervisor'));
CREATE POLICY "Supervisor/Admin can update field reports" ON public.field_reports FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'site_supervisor'));
CREATE POLICY "Admin can delete field reports" ON public.field_reports FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_field_reports_updated_at BEFORE UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 2. field_report_photos
-- =============================================
CREATE TABLE public.field_report_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_report_id UUID NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.field_report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view field report photos" ON public.field_report_photos FOR SELECT USING (EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.id = field_report_photos.field_report_id AND is_member_of_org(auth.uid(), fr.organization_id)));
CREATE POLICY "Supervisor/Admin can insert field report photos" ON public.field_report_photos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.id = field_report_photos.field_report_id AND (has_org_role(auth.uid(), fr.organization_id, 'admin') OR has_org_role(auth.uid(), fr.organization_id, 'site_supervisor'))));
CREATE POLICY "Admin can delete field report photos" ON public.field_report_photos FOR DELETE USING (EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.id = field_report_photos.field_report_id AND is_org_admin(auth.uid(), fr.organization_id)));

-- =============================================
-- 3. expenses
-- =============================================
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Accountant/Admin can insert expenses" ON public.expenses FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'accountant'));
CREATE POLICY "Accountant/Admin can update expenses" ON public.expenses FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'accountant'));
CREATE POLICY "Admin can delete expenses" ON public.expenses FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- =============================================
-- 4. equipment
-- =============================================
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  type TEXT,
  serial_number TEXT,
  status equipment_status NOT NULL DEFAULT 'available',
  current_site_project_id UUID REFERENCES public.projects(id),
  usage_hours NUMERIC DEFAULT 0,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view equipment" ON public.equipment FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Warehouse/Supervisor/Admin can insert equipment" ON public.equipment FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'warehouse_manager') OR has_org_role(auth.uid(), organization_id, 'site_supervisor'));
CREATE POLICY "Warehouse/Supervisor/Admin can update equipment" ON public.equipment FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'warehouse_manager') OR has_org_role(auth.uid(), organization_id, 'site_supervisor'));
CREATE POLICY "Admin can delete equipment" ON public.equipment FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 5. equipment_logs
-- =============================================
CREATE TABLE public.equipment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  log_type equipment_log_type NOT NULL,
  description TEXT,
  logged_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view equipment logs" ON public.equipment_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.equipment eq WHERE eq.id = equipment_logs.equipment_id AND is_member_of_org(auth.uid(), eq.organization_id)));
CREATE POLICY "Warehouse/Supervisor/Admin can insert equipment logs" ON public.equipment_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.equipment eq WHERE eq.id = equipment_logs.equipment_id AND (has_org_role(auth.uid(), eq.organization_id, 'admin') OR has_org_role(auth.uid(), eq.organization_id, 'warehouse_manager') OR has_org_role(auth.uid(), eq.organization_id, 'site_supervisor'))));

-- =============================================
-- 6. compliance_documents
-- =============================================
CREATE TABLE public.compliance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  status compliance_status NOT NULL DEFAULT 'pending',
  expiry_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view compliance documents" ON public.compliance_documents FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Supervisor/Admin can insert compliance docs" ON public.compliance_documents FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'site_supervisor'));
CREATE POLICY "Supervisor/Admin can update compliance docs" ON public.compliance_documents FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'site_supervisor'));
CREATE POLICY "Admin can delete compliance docs" ON public.compliance_documents FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- =============================================
-- 7. knowledge_articles
-- =============================================
CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  pipe_sizes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view knowledge articles" ON public.knowledge_articles FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Admin can insert knowledge articles" ON public.knowledge_articles FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admin can update knowledge articles" ON public.knowledge_articles FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admin can delete knowledge articles" ON public.knowledge_articles FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_knowledge_articles_updated_at BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 8. opportunities
-- =============================================
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  source TEXT,
  description TEXT,
  estimated_value NUMERIC,
  deadline DATE,
  status opportunity_status NOT NULL DEFAULT 'identified',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view opportunities" ON public.opportunities FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Sales/Admin can insert opportunities" ON public.opportunities FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'sales_manager'));
CREATE POLICY "Sales/Admin can update opportunities" ON public.opportunities FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'admin') OR has_org_role(auth.uid(), organization_id, 'sales_manager'));
CREATE POLICY "Admin can delete opportunities" ON public.opportunities FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 9. audit_logs
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (is_member_of_org(auth.uid(), organization_id));

-- =============================================
-- 10. Storage buckets
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('site-photos', 'site-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('compliance-docs', 'compliance-docs', false);

-- Storage policies for site-photos
CREATE POLICY "Anyone can view site photos" ON storage.objects FOR SELECT USING (bucket_id = 'site-photos');
CREATE POLICY "Authenticated users can upload site photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own site photos" ON storage.objects FOR DELETE USING (bucket_id = 'site-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for compliance-docs
CREATE POLICY "Authenticated users can view compliance docs" ON storage.objects FOR SELECT USING (bucket_id = 'compliance-docs' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can upload compliance docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'compliance-docs' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own compliance docs" ON storage.objects FOR DELETE USING (bucket_id = 'compliance-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
