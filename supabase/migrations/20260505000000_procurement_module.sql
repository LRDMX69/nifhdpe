-- 1. Vendor Master
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT, -- e.g., 'HDPE Pipes', 'Fittings', 'Fuel', 'Services'
  bank_details JSONB, -- { "bank_name": "...", "account_number": "...", "account_name": "..." }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view vendors" ON public.vendors FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.vendors.organization_id));
CREATE POLICY "Admins/Procurement can manage vendors" ON public.vendors FOR ALL TO authenticated USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid()));

-- 2. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  project_id UUID REFERENCES public.projects(id),
  document_number TEXT UNIQUE, -- e.g., PO/2026/0001
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'issued', 'partially_received', 'received', 'cancelled'
  total_amount DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  notes TEXT,
  delivery_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view POs" ON public.purchase_orders FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.purchase_orders.organization_id));
CREATE POLICY "Admins/Procurement can manage POs" ON public.purchase_orders FOR ALL TO authenticated USING (has_org_role(auth.uid(), organization_id, 'administrator'::app_role) OR has_org_role(auth.uid(), organization_id, 'finance'::app_role) OR is_maintenance_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(12, 2) NOT NULL,
  unit TEXT, -- 'meters', 'pcs', 'liters', etc.
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  received_quantity DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view PO items" ON public.purchase_order_items FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = (SELECT organization_id FROM purchase_orders WHERE id = purchase_order_id)));

-- 3. Goods Received Notes (GRN)
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  document_number TEXT UNIQUE, -- e.g., GRN/2026/0001
  delivery_note_number TEXT,
  received_date DATE DEFAULT CURRENT_DATE,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'inspected', 'accepted', 'rejected'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view GRNs" ON public.goods_received_notes FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.goods_received_notes.organization_id));

CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.goods_received_notes(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES public.purchase_order_items(id),
  item_name TEXT NOT NULL,
  quantity_received DECIMAL(12, 2) NOT NULL,
  condition TEXT, -- 'good', 'damaged', 'shortage'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Vendor Invoices (for 3-way match)
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  grn_id UUID REFERENCES public.goods_received_notes(id),
  invoice_number TEXT NOT NULL,
  document_number TEXT UNIQUE, -- e.g., VINV/2026/0001
  invoice_date DATE NOT NULL,
  due_date DATE,
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'matched', 'approved', 'paid', 'void'
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid'
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view vendor invoices" ON public.vendor_invoices FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.vendor_invoices.organization_id));

-- 5. Material Requisitions (from site/crew)
CREATE TABLE IF NOT EXISTS public.material_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  document_number TEXT UNIQUE, -- e.g., MR/2026/0001
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'partially_issued', 'issued', 'cancelled'
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  required_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.material_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view MRs" ON public.material_requisitions FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.material_requisitions.organization_id));

CREATE TABLE IF NOT EXISTS public.mr_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mr_id UUID NOT NULL REFERENCES public.material_requisitions(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id), -- If it's a known stock item
  item_name TEXT NOT NULL,
  quantity_requested DECIMAL(12, 2) NOT NULL,
  quantity_issued DECIMAL(12, 2) DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers for document numbering
CREATE TRIGGER tr_purchase_orders_doc_num BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
CREATE TRIGGER tr_goods_received_notes_doc_num BEFORE INSERT ON public.goods_received_notes FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
CREATE TRIGGER tr_vendor_invoices_doc_num BEFORE INSERT ON public.vendor_invoices FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
CREATE TRIGGER tr_material_requisitions_doc_num BEFORE INSERT ON public.material_requisitions FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();

-- Update function for auto-deduct inventory on issue
CREATE OR REPLACE FUNCTION public.handle_mr_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If quantity_issued is updated and there is an inventory_id
  IF (TG_OP = 'UPDATE' AND NEW.quantity_issued > OLD.quantity_issued AND NEW.inventory_id IS NOT NULL) THEN
    UPDATE public.inventory
    SET quantity_meters = quantity_meters - (NEW.quantity_issued - OLD.quantity_issued)
    WHERE id = NEW.inventory_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_mr_items_issue AFTER UPDATE ON public.mr_items FOR EACH ROW EXECUTE FUNCTION public.handle_mr_issue();

-- 6. Trigger to auto-update stock on GRN acceptance
CREATE OR REPLACE FUNCTION public.handle_grn_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status changes to 'accepted' or 'inspected' (assuming these imply stock entry)
  IF (NEW.status IN ('accepted', 'inspected') AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'inspected'))) THEN
    -- Update inventory for each item in the GRN
    -- We'll need to link GRN items to specific inventory records.
    -- Currently grn_items has purchase_order_item_id, but purchase_order_items doesn't have inventory_id.
    -- Let's fix that by assuming items are matched by name or adding a column.
    
    -- For now, we update based on purchase_order_items if they are linked to inventory
    -- (This requires adding inventory_id to purchase_order_items or matching by name)
    
    UPDATE public.inventory inv
    SET quantity_meters = inv.quantity_meters + gi.quantity_received
    FROM public.grn_items gi
    JOIN public.purchase_order_items poi ON gi.purchase_order_item_id = poi.id
    WHERE gi.grn_id = NEW.id 
    AND poi.item_name = inv.item_name; -- Match by name for now, improve with IDs later
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_grn_acceptance AFTER UPDATE ON public.goods_received_notes FOR EACH ROW EXECUTE FUNCTION public.handle_grn_acceptance();
