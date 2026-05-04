
-- =================== VENDORS ===================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT,
  bank_details JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view vendors" ON public.vendors FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/Finance can manage vendors" ON public.vendors FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid()));

-- =================== PURCHASE ORDERS ===================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  project_id UUID,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  notes TEXT,
  delivery_date DATE,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view POs" ON public.purchase_orders FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/Finance can manage POs" ON public.purchase_orders FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View PO items via parent" ON public.purchase_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND (is_member_of_org(auth.uid(), po.organization_id) OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Manage PO items via parent" ON public.purchase_order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND (has_org_role(auth.uid(), po.organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), po.organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND (has_org_role(auth.uid(), po.organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), po.organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid()))));

-- =================== GRN ===================
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  vendor_id UUID REFERENCES public.vendors(id),
  document_number TEXT,
  delivery_note_number TEXT,
  received_date DATE DEFAULT CURRENT_DATE,
  received_by UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view GRNs" ON public.goods_received_notes FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/Warehouse can manage GRNs" ON public.goods_received_notes FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.goods_received_notes(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES public.purchase_order_items(id),
  item_name TEXT NOT NULL,
  quantity_received NUMERIC NOT NULL,
  condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View GRN items via parent" ON public.grn_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.goods_received_notes g WHERE g.id = grn_id AND (is_member_of_org(auth.uid(), g.organization_id) OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Manage GRN items via parent" ON public.grn_items FOR ALL USING (EXISTS (SELECT 1 FROM public.goods_received_notes g WHERE g.id = grn_id AND (has_org_role(auth.uid(), g.organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), g.organization_id, 'warehouse'::app_role) OR is_maintenance_admin(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.goods_received_notes g WHERE g.id = grn_id AND (has_org_role(auth.uid(), g.organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), g.organization_id, 'warehouse'::app_role) OR is_maintenance_admin(auth.uid()))));

-- =================== MATERIAL REQUISITIONS ===================
CREATE TABLE IF NOT EXISTS public.material_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID,
  document_number TEXT,
  status TEXT DEFAULT 'pending',
  requested_by UUID NOT NULL,
  approved_by UUID,
  required_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.material_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view MRs" ON public.material_requisitions FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can create MRs" ON public.material_requisitions FOR INSERT WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/Warehouse can update MRs" ON public.material_requisitions FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.mr_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mr_id UUID NOT NULL REFERENCES public.material_requisitions(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id),
  item_name TEXT NOT NULL,
  quantity_requested NUMERIC NOT NULL,
  quantity_issued NUMERIC DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mr_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View MR items via parent" ON public.mr_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.material_requisitions m WHERE m.id = mr_id AND (is_member_of_org(auth.uid(), m.organization_id) OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Manage MR items via parent" ON public.mr_items FOR ALL USING (EXISTS (SELECT 1 FROM public.material_requisitions m WHERE m.id = mr_id AND (is_member_of_org(auth.uid(), m.organization_id) OR is_maintenance_admin(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.material_requisitions m WHERE m.id = mr_id AND (is_member_of_org(auth.uid(), m.organization_id) OR is_maintenance_admin(auth.uid()))));

-- =================== INVOICES ===================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID,
  quotation_id UUID,
  document_number TEXT,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view invoices" ON public.invoices FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/Finance/Sales can manage invoices" ON public.invoices FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role) OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR has_org_role(auth.uid(), organization_id, 'reception_sales'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View invoice items via parent" ON public.invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (is_member_of_org(auth.uid(), i.organization_id) OR is_maintenance_admin(auth.uid()))));
CREATE POLICY "Manage invoice items via parent" ON public.invoice_items FOR ALL USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (has_org_role(auth.uid(), i.organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), i.organization_id, 'finance'::app_role) OR has_org_role(auth.uid(), i.organization_id, 'reception_sales'::app_role) OR is_maintenance_admin(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (has_org_role(auth.uid(), i.organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), i.organization_id, 'finance'::app_role) OR has_org_role(auth.uid(), i.organization_id, 'reception_sales'::app_role) OR is_maintenance_admin(auth.uid()))));

-- =================== RECEIPTS ===================
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID,
  invoice_id UUID REFERENCES public.invoices(id),
  document_number TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  amount_received NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  received_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view receipts" ON public.receipts FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/Finance can manage receipts" ON public.receipts FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid()));

-- =================== VEHICLES & FUEL ===================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  status TEXT DEFAULT 'active',
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view vehicles" ON public.vehicles FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/Warehouse can manage vehicles" ON public.vehicles FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR is_maintenance_admin(auth.uid())) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'warehouse'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  log_date DATE DEFAULT CURRENT_DATE,
  liters NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  odometer NUMERIC,
  notes TEXT,
  logged_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view fuel logs" ON public.fuel_logs FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can insert fuel logs" ON public.fuel_logs FOR INSERT WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can update fuel logs" ON public.fuel_logs FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR is_maintenance_admin(auth.uid()));

-- =================== TOOLBOX TALKS ===================
CREATE TABLE IF NOT EXISTS public.toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID,
  topic TEXT NOT NULL,
  conducted_by UUID NOT NULL,
  conducted_at DATE DEFAULT CURRENT_DATE,
  attendees JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.toolbox_talks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view toolbox talks" ON public.toolbox_talks FOR SELECT USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Members can insert toolbox talks" ON public.toolbox_talks FOR INSERT WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin/HR can manage toolbox talks" ON public.toolbox_talks FOR UPDATE USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'hr'::app_role) OR is_maintenance_admin(auth.uid()));

-- =================== Auto doc-number triggers for new tables ===================
DROP TRIGGER IF EXISTS tr_purchase_orders_doc_num ON public.purchase_orders;
CREATE TRIGGER tr_purchase_orders_doc_num BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
DROP TRIGGER IF EXISTS tr_grn_doc_num ON public.goods_received_notes;
CREATE TRIGGER tr_grn_doc_num BEFORE INSERT ON public.goods_received_notes FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
DROP TRIGGER IF EXISTS tr_mr_doc_num ON public.material_requisitions;
CREATE TRIGGER tr_mr_doc_num BEFORE INSERT ON public.material_requisitions FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
DROP TRIGGER IF EXISTS tr_invoices_doc_num ON public.invoices;
CREATE TRIGGER tr_invoices_doc_num BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
DROP TRIGGER IF EXISTS tr_receipts_doc_num ON public.receipts;
CREATE TRIGGER tr_receipts_doc_num BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
