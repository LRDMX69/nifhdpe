
-- ============================================
-- STEP 1: DROP ALL RLS POLICIES THAT DEPEND ON has_org_role
-- ============================================

-- clients
DROP POLICY IF EXISTS "Sales/Admin can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Sales/Admin can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admin can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Members can view clients" ON public.clients;

-- compliance_documents
DROP POLICY IF EXISTS "Supervisor/Admin can insert compliance docs" ON public.compliance_documents;
DROP POLICY IF EXISTS "Supervisor/Admin can update compliance docs" ON public.compliance_documents;
DROP POLICY IF EXISTS "Admin can delete compliance docs" ON public.compliance_documents;
DROP POLICY IF EXISTS "Members can view compliance documents" ON public.compliance_documents;

-- equipment
DROP POLICY IF EXISTS "Warehouse/Supervisor/Admin can insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Warehouse/Supervisor/Admin can update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admin can delete equipment" ON public.equipment;
DROP POLICY IF EXISTS "Members can view equipment" ON public.equipment;

-- equipment_logs
DROP POLICY IF EXISTS "Warehouse/Supervisor/Admin can insert equipment logs" ON public.equipment_logs;
DROP POLICY IF EXISTS "Members can view equipment logs" ON public.equipment_logs;

-- expenses
DROP POLICY IF EXISTS "Accountant/Admin can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Accountant/Admin can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;

-- field_reports
DROP POLICY IF EXISTS "Supervisor/Admin can insert field reports" ON public.field_reports;
DROP POLICY IF EXISTS "Supervisor/Admin can update field reports" ON public.field_reports;
DROP POLICY IF EXISTS "Admin can delete field reports" ON public.field_reports;
DROP POLICY IF EXISTS "Members can view field reports" ON public.field_reports;

-- field_report_photos
DROP POLICY IF EXISTS "Supervisor/Admin can insert field report photos" ON public.field_report_photos;
DROP POLICY IF EXISTS "Admin can delete field report photos" ON public.field_report_photos;
DROP POLICY IF EXISTS "Members can view field report photos" ON public.field_report_photos;

-- inventory
DROP POLICY IF EXISTS "Warehouse/Admin can insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "Warehouse/Admin can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admin can delete inventory" ON public.inventory;
DROP POLICY IF EXISTS "Members can view inventory" ON public.inventory;

-- knowledge_articles
DROP POLICY IF EXISTS "Admin can insert knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Admin can update knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Admin can delete knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Members can view knowledge articles" ON public.knowledge_articles;

-- opportunities
DROP POLICY IF EXISTS "Sales/Admin can insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Sales/Admin can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admin can delete opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Members can view opportunities" ON public.opportunities;

-- organization_memberships
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_memberships;

-- organizations
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;

-- profiles
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- projects
DROP POLICY IF EXISTS "Supervisor/Sales/Admin can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Supervisor/Accountant/Admin can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admin can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;

-- quotations
DROP POLICY IF EXISTS "Sales/Admin can insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Sales/Admin can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admin can delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "Members can view quotations" ON public.quotations;

-- quotation_items
DROP POLICY IF EXISTS "Sales/Admin can insert quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Sales/Admin can update quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Admin can delete quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Members can view quotation items" ON public.quotation_items;

-- audit_logs
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- ============================================
-- STEP 2: DROP FUNCTIONS THAT USE OLD ENUM
-- ============================================
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid);

-- ============================================
-- STEP 3: REPLACE ENUM
-- ============================================
ALTER TABLE public.organization_memberships ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.organization_memberships
  ALTER COLUMN role TYPE text;

DROP TYPE IF EXISTS public.new_app_role;
DROP TYPE public.app_role;

CREATE TYPE public.app_role AS ENUM (
  'administrator', 'engineer', 'technician', 'warehouse', 'finance', 'hr', 'reception_sales'
);

ALTER TABLE public.organization_memberships
  ALTER COLUMN role TYPE public.app_role
  USING CASE role
    WHEN 'admin' THEN 'administrator'::public.app_role
    WHEN 'sales_manager' THEN 'reception_sales'::public.app_role
    WHEN 'warehouse_manager' THEN 'warehouse'::public.app_role
    WHEN 'site_supervisor' THEN 'technician'::public.app_role
    WHEN 'accountant' THEN 'finance'::public.app_role
    WHEN 'administrator' THEN 'administrator'::public.app_role
    WHEN 'engineer' THEN 'engineer'::public.app_role
    WHEN 'technician' THEN 'technician'::public.app_role
    WHEN 'warehouse' THEN 'warehouse'::public.app_role
    WHEN 'finance' THEN 'finance'::public.app_role
    WHEN 'hr' THEN 'hr'::public.app_role
    WHEN 'reception_sales' THEN 'reception_sales'::public.app_role
    ELSE 'technician'::public.app_role
  END;

ALTER TABLE public.organization_memberships
  ALTER COLUMN role SET DEFAULT 'technician'::public.app_role;

-- ============================================
-- STEP 4: MAINTENANCE ADMIN SYSTEM
-- ============================================
CREATE TABLE public.system_maintenance_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.system_maintenance_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_maintenance_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_maintenance_accounts WHERE user_id = _uid
  );
$$;

-- ============================================
-- STEP 5: RECREATE HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'administrator'
  ) OR is_maintenance_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.count_visible_admins(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.organization_memberships
  WHERE organization_id = _org_id
    AND role = 'administrator'
    AND user_id NOT IN (SELECT user_id FROM public.system_maintenance_accounts);
$$;

CREATE OR REPLACE FUNCTION public.get_visible_members(_org_id uuid)
RETURNS SETOF public.organization_memberships
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.* FROM public.organization_memberships om
  WHERE om.organization_id = _org_id
    AND om.user_id NOT IN (SELECT user_id FROM public.system_maintenance_accounts);
$$;

-- ============================================
-- STEP 6: MULTI-ROLE CONSTRAINT (max 2 per user per org)
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_max_roles()
RETURNS trigger
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

CREATE TRIGGER check_max_roles
  BEFORE INSERT ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_roles();

-- ============================================
-- STEP 7: ADMIN REQUESTS TABLE
-- ============================================
CREATE TABLE public.admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin requests" ON public.admin_requests FOR SELECT
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Users can create admin requests" ON public.admin_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update admin requests" ON public.admin_requests FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));

-- ============================================
-- STEP 8: HR TABLES
-- ============================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'leave')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attendance" ON public.attendance FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR/Admin can insert attendance" ON public.attendance FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR auth.uid() = user_id OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR/Admin can update attendance" ON public.attendance FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));

CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual' CHECK (leave_type IN ('annual', 'sick', 'emergency', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view leave requests" ON public.leave_requests FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Users can create leave requests" ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR/Admin can update leave requests" ON public.leave_requests FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));

CREATE TABLE public.performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view performance logs" ON public.performance_logs FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR/Admin can insert performance logs" ON public.performance_logs FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "HR/Admin can update performance logs" ON public.performance_logs FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'hr') OR is_maintenance_admin(auth.uid()));

-- ============================================
-- STEP 9: WORKER PAYMENTS
-- ============================================
CREATE TYPE public.payment_type AS ENUM ('salary', 'overtime', 'fuel', 'maintenance', 'bonus', 'transport', 'vendor');

CREATE TABLE public.worker_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.payment_type NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  vendor_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance/Admin can view payments" ON public.worker_payments FOR SELECT
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance/Admin can insert payments" ON public.worker_payments FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance/Admin can update payments" ON public.worker_payments FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete payments" ON public.worker_payments FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));

-- ============================================
-- STEP 10: AI TABLES
-- ============================================
CREATE TABLE public.ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  context TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ai summaries" ON public.ai_summaries FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "System can insert ai summaries" ON public.ai_summaries FOR INSERT
  WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE TABLE public.structured_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_report_id UUID NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  structured_content TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.structured_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view structured reports" ON public.structured_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.id = structured_reports.field_report_id AND (is_member_of_org(auth.uid(), fr.organization_id) OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "System can insert structured reports" ON public.structured_reports FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.id = structured_reports.field_report_id AND (is_member_of_org(auth.uid(), fr.organization_id) OR is_maintenance_admin(auth.uid()))));

-- ============================================
-- STEP 11: OPPORTUNITY ENHANCEMENTS
-- ============================================
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS relevance_score NUMERIC,
  ADD COLUMN IF NOT EXISTS success_probability NUMERIC,
  ADD COLUMN IF NOT EXISTS capital_estimate NUMERIC,
  ADD COLUMN IF NOT EXISTS bid_strategy TEXT,
  ADD COLUMN IF NOT EXISTS competition_intensity TEXT;

-- ============================================
-- STEP 12: RECREATE ALL RLS POLICIES WITH NEW ROLES
-- ============================================

-- CLIENTS
CREATE POLICY "Sales/Admin can insert clients" ON public.clients FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Sales/Admin can update clients" ON public.clients FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete clients" ON public.clients FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view clients" ON public.clients FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- COMPLIANCE_DOCUMENTS
CREATE POLICY "Engineer/Admin can insert compliance docs" ON public.compliance_documents FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Engineer/Admin can update compliance docs" ON public.compliance_documents FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete compliance docs" ON public.compliance_documents FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view compliance documents" ON public.compliance_documents FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- EQUIPMENT
CREATE POLICY "Warehouse/Tech/Engineer/Admin can insert equipment" ON public.equipment FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Warehouse/Tech/Engineer/Admin can update equipment" ON public.equipment FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete equipment" ON public.equipment FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view equipment" ON public.equipment FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- EQUIPMENT_LOGS
CREATE POLICY "Warehouse/Tech/Engineer/Admin can insert equipment logs" ON public.equipment_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM equipment eq WHERE eq.id = equipment_logs.equipment_id AND (has_org_role(auth.uid(), eq.organization_id, 'administrator') OR has_org_role(auth.uid(), eq.organization_id, 'warehouse') OR has_org_role(auth.uid(), eq.organization_id, 'engineer') OR has_org_role(auth.uid(), eq.organization_id, 'technician') OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Members can view equipment logs" ON public.equipment_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM equipment eq WHERE eq.id = equipment_logs.equipment_id AND (is_member_of_org(auth.uid(), eq.organization_id) OR is_maintenance_admin(auth.uid()))));

-- EXPENSES
CREATE POLICY "Finance/Admin can insert expenses" ON public.expenses FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Finance/Admin can update expenses" ON public.expenses FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete expenses" ON public.expenses FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- FIELD_REPORTS
CREATE POLICY "Tech/Engineer/Admin can insert field reports" ON public.field_reports FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'technician') OR has_org_role(auth.uid(), organization_id, 'engineer') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Tech/Engineer/Admin can update field reports" ON public.field_reports FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'technician') OR has_org_role(auth.uid(), organization_id, 'engineer') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete field reports" ON public.field_reports FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view field reports" ON public.field_reports FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- FIELD_REPORT_PHOTOS
CREATE POLICY "Tech/Engineer/Admin can insert field report photos" ON public.field_report_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM field_reports fr WHERE fr.id = field_report_photos.field_report_id AND (has_org_role(auth.uid(), fr.organization_id, 'administrator') OR has_org_role(auth.uid(), fr.organization_id, 'technician') OR has_org_role(auth.uid(), fr.organization_id, 'engineer') OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Admin can delete field report photos" ON public.field_report_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM field_reports fr WHERE fr.id = field_report_photos.field_report_id AND (has_org_role(auth.uid(), fr.organization_id, 'administrator') OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Members can view field report photos" ON public.field_report_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM field_reports fr WHERE fr.id = field_report_photos.field_report_id AND (is_member_of_org(auth.uid(), fr.organization_id) OR is_maintenance_admin(auth.uid()))));

-- INVENTORY
CREATE POLICY "Warehouse/Admin can insert inventory" ON public.inventory FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Warehouse/Admin can update inventory" ON public.inventory FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete inventory" ON public.inventory FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view inventory" ON public.inventory FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- KNOWLEDGE_ARTICLES
CREATE POLICY "Admin can insert knowledge articles" ON public.knowledge_articles FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can update knowledge articles" ON public.knowledge_articles FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete knowledge articles" ON public.knowledge_articles FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view knowledge articles" ON public.knowledge_articles FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- OPPORTUNITIES
CREATE POLICY "Sales/Admin can insert opportunities" ON public.opportunities FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Sales/Admin can update opportunities" ON public.opportunities FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete opportunities" ON public.opportunities FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view opportunities" ON public.opportunities FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- ORGANIZATION_MEMBERSHIPS
CREATE POLICY "Admins can insert memberships" ON public.organization_memberships FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Admins can update memberships" ON public.organization_memberships FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admins can delete memberships" ON public.organization_memberships FOR DELETE
  USING ((has_org_role(auth.uid(), organization_id, 'administrator') AND user_id <> auth.uid()) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view org memberships" ON public.organization_memberships FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- ORGANIZATIONS
CREATE POLICY "Admins can update their organization" ON public.organizations FOR UPDATE
  USING (is_org_admin(auth.uid(), id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view their organization" ON public.organizations FOR SELECT
  USING (is_member_of_org(auth.uid(), id) OR is_maintenance_admin(auth.uid()));

-- PROFILES
CREATE POLICY "Users can view profiles in their org" ON public.profiles FOR SELECT
  USING (((organization_id IS NULL) AND (user_id = auth.uid())) OR (organization_id = get_user_org_id(auth.uid())) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
  USING (user_id = auth.uid() OR is_maintenance_admin(auth.uid()));

-- PROJECTS
CREATE POLICY "Tech/Engineer/Sales/Admin can insert projects" ON public.projects FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Tech/Engineer/Finance/Admin can update projects" ON public.projects FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete projects" ON public.projects FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- QUOTATIONS
CREATE POLICY "Sales/Admin can insert quotations" ON public.quotations FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Sales/Admin can update quotations" ON public.quotations FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete quotations" ON public.quotations FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can view quotations" ON public.quotations FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- QUOTATION_ITEMS
CREATE POLICY "Sales/Admin can insert quotation items" ON public.quotation_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND (has_org_role(auth.uid(), q.organization_id, 'administrator') OR has_org_role(auth.uid(), q.organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Sales/Admin can update quotation items" ON public.quotation_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND (has_org_role(auth.uid(), q.organization_id, 'administrator') OR has_org_role(auth.uid(), q.organization_id, 'reception_sales') OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Admin can delete quotation items" ON public.quotation_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND (has_org_role(auth.uid(), q.organization_id, 'administrator') OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Members can view quotation items" ON public.quotation_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND (is_member_of_org(auth.uid(), q.organization_id) OR is_maintenance_admin(auth.uid()))));

-- AUDIT_LOGS
CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT
  WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
