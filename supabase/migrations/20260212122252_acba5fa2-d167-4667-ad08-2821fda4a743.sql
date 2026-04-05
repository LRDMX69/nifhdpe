
-- =============================================
-- NIF Technical Operations Suite - Phase 1 Schema
-- =============================================

-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_manager', 'warehouse_manager', 'site_supervisor', 'accountant');

-- Quotation status enum
CREATE TYPE public.quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');

-- Project status enum
CREATE TYPE public.project_status AS ENUM ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled');

-- Pipe type enum
CREATE TYPE public.pipe_type AS ENUM ('hdpe', 'pvc', 'custom');

-- Item type enum for quotation items
CREATE TYPE public.quotation_item_type AS ENUM ('pipe', 'fitting', 'labor', 'transport', 'other');

-- =============================================
-- 1. Organizations
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Organization Memberships (role table)
-- =============================================
CREATE TABLE public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'sales_manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. Profiles
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Clients
-- =============================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. Quotations
-- =============================================
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  quotation_number TEXT NOT NULL,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  pipe_type public.pipe_type DEFAULT 'hdpe',
  labor_cost_per_meter NUMERIC(12,2) DEFAULT 0,
  transport_cost NUMERIC(12,2) DEFAULT 0,
  profit_margin_percent NUMERIC(5,2) DEFAULT 15,
  subtotal NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  is_lump_sum BOOLEAN DEFAULT false,
  lump_sum_amount NUMERIC(14,2),
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. Quotation Items
-- =============================================
CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  item_type public.quotation_item_type NOT NULL DEFAULT 'pipe',
  description TEXT NOT NULL,
  diameter_mm INTEGER,
  length_meters NUMERIC(10,2),
  thickness_mm NUMERIC(6,2),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. Inventory
-- =============================================
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type public.pipe_type DEFAULT 'hdpe',
  diameter_mm INTEGER,
  thickness_mm NUMERIC(6,2),
  quantity_meters NUMERIC(12,2) DEFAULT 0,
  unit_cost NUMERIC(12,2) DEFAULT 0,
  min_stock_level NUMERIC(12,2) DEFAULT 10,
  supplier TEXT,
  supplier_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. Projects
-- =============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'planning',
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Helper Functions (SECURITY DEFINER)
-- =============================================

-- Check if user is member of an organization
CREATE OR REPLACE FUNCTION public.is_member_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id
  );
$$;

-- Check if user has a specific role in an organization
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  );
$$;

-- Check if user is admin of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'admin'
  );
$$;

-- Get user's organization id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_memberships
  WHERE user_id = _user_id LIMIT 1;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
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

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- RLS Policies
-- =============================================

-- Organizations: members can read their own org
CREATE POLICY "Members can view their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), id));

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), id));

-- Organization Memberships
CREATE POLICY "Members can view org memberships"
  ON public.organization_memberships FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert memberships"
  ON public.organization_memberships FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update memberships"
  ON public.organization_memberships FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can delete memberships"
  ON public.organization_memberships FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) AND user_id != auth.uid());

-- Profiles
CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    organization_id IS NULL AND user_id = auth.uid()
    OR organization_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Clients
CREATE POLICY "Members can view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Sales/Admin can insert clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'sales_manager')
  );

CREATE POLICY "Sales/Admin can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'sales_manager')
  );

CREATE POLICY "Admin can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Quotations
CREATE POLICY "Members can view quotations"
  ON public.quotations FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Sales/Admin can insert quotations"
  ON public.quotations FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'sales_manager')
  );

CREATE POLICY "Sales/Admin can update quotations"
  ON public.quotations FOR UPDATE TO authenticated
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'sales_manager')
    OR public.has_org_role(auth.uid(), organization_id, 'accountant')
  );

CREATE POLICY "Admin can delete quotations"
  ON public.quotations FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Quotation Items
CREATE POLICY "Members can view quotation items"
  ON public.quotation_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
      AND public.is_member_of_org(auth.uid(), q.organization_id)
    )
  );

CREATE POLICY "Sales/Admin can insert quotation items"
  ON public.quotation_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
      AND (public.has_org_role(auth.uid(), q.organization_id, 'admin')
           OR public.has_org_role(auth.uid(), q.organization_id, 'sales_manager'))
    )
  );

CREATE POLICY "Sales/Admin can update quotation items"
  ON public.quotation_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
      AND (public.has_org_role(auth.uid(), q.organization_id, 'admin')
           OR public.has_org_role(auth.uid(), q.organization_id, 'sales_manager'))
    )
  );

CREATE POLICY "Admin can delete quotation items"
  ON public.quotation_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
      AND public.is_org_admin(auth.uid(), q.organization_id)
    )
  );

-- Inventory
CREATE POLICY "Members can view inventory"
  ON public.inventory FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Warehouse/Admin can insert inventory"
  ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'warehouse_manager')
  );

CREATE POLICY "Warehouse/Admin can update inventory"
  ON public.inventory FOR UPDATE TO authenticated
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'warehouse_manager')
  );

CREATE POLICY "Admin can delete inventory"
  ON public.inventory FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Projects
CREATE POLICY "Members can view projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Supervisor/Sales/Admin can insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'sales_manager')
    OR public.has_org_role(auth.uid(), organization_id, 'site_supervisor')
  );

CREATE POLICY "Supervisor/Accountant/Admin can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR public.has_org_role(auth.uid(), organization_id, 'site_supervisor')
    OR public.has_org_role(auth.uid(), organization_id, 'accountant')
  );

CREATE POLICY "Admin can delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));
