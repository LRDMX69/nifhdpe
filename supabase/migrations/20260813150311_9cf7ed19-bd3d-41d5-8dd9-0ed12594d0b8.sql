-- NIFHDPE industrial workflow foundations
-- Additive only. Company policy values remain configurable and are not hardcoded here.

CREATE TABLE IF NOT EXISTS public.product_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('hdpe_pipe','hdpe_fitting','equipment','accessory','service','other')),
  material_grade text,
  pe_grade text,
  sdr text,
  pressure_class text,
  diameter_mm numeric,
  dimensions text,
  unit text NOT NULL DEFAULT 'each',
  standard text,
  manufacturer text,
  supplier_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  application text,
  compatibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  certificates jsonb NOT NULL DEFAULT '[]'::jsonb,
  configurable_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_code)
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','partially_fulfilled','fulfilled','cancelled')),
  order_date date NOT NULL DEFAULT current_date,
  currency text NOT NULL DEFAULT 'NGN',
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  configurable_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'each',
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price numeric NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  fulfilled_quantity numeric NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
  configurable_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  lot_batch text,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','released','fulfilled','cancelled')),
  reserved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('receipt','issue','reservation','release','transfer','adjustment','return','rejection')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  lot_batch text,
  from_location_id uuid REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('quotation','invoice','purchase_order','delivery','project','field_report','sales_order','other')),
  entity_id uuid NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  is_current boolean NOT NULL DEFAULT true,
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_reason text NOT NULL,
  UNIQUE (organization_id, entity_type, entity_id, revision_number)
);

CREATE TABLE IF NOT EXISTS public.project_work_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','blocked','completed','cancelled')),
  sequence_no integer NOT NULL DEFAULT 1,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  budget_amount numeric NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fusion_joints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  work_package_id uuid REFERENCES public.project_work_packages(id) ON DELETE SET NULL,
  joint_id text NOT NULL,
  joint_type text NOT NULL CHECK (joint_type IN ('butt_fusion','electrofusion','socket_fusion','mechanical','other')),
  location text,
  pipe_fitting_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  material_lot text,
  operator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
  machine_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  fusion_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_at timestamptz,
  inspection jsonb NOT NULL DEFAULT '{}'::jsonb,
  test_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  result text NOT NULL DEFAULT 'awaiting_configuration' CHECK (result IN ('awaiting_configuration','pass','fail','rework','rejected')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, joint_id)
);

CREATE TABLE IF NOT EXISTS public.project_handover_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_client_signoff','accepted','rejected','closed')),
  qa_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_signoff jsonb NOT NULL DEFAULT '{}'::jsonb,
  warranty_configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  handover_document_id uuid REFERENCES public.compliance_documents(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE TABLE IF NOT EXISTS public.warranty_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  serial_or_asset_code text,
  installed_at date,
  warranty_configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','void','closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  warranty_asset_id uuid REFERENCES public.warranty_assets(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','triaged','assigned','in_progress','waiting_customer','resolved','closed','rejected')),
  subject text NOT NULL,
  description text,
  assigned_technician_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  response_at timestamptz,
  resolved_at timestamptz,
  resolution text,
  parts_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ticket_number)
);

CREATE TABLE IF NOT EXISTS public.business_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.management_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config_key text NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval','approved','disabled')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_product_specs_org_code ON public.product_specifications(organization_id, product_code);
CREATE INDEX IF NOT EXISTS idx_sales_orders_org_client ON public.sales_orders(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_org_status ON public.sales_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_org_status ON public.inventory_reservations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_created ON public.stock_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_revisions_entity ON public.document_revisions(organization_id, entity_type, entity_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_fusion_joints_project ON public.fusion_joints(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_org_status ON public.service_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.business_audit_events(organization_id, entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_industrial_foundation_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['product_specifications','sales_orders','project_work_packages','fusion_joints','project_handover_records','service_tickets','management_configuration'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'touch_' || t, t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_industrial_foundation_updated_at()', 'touch_' || t, t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_specifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_work_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fusion_joints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_handover_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warranty_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_audit_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_configuration TO authenticated;
GRANT ALL ON public.product_specifications TO service_role;
GRANT ALL ON public.sales_orders TO service_role;
GRANT ALL ON public.sales_order_items TO service_role;
GRANT ALL ON public.inventory_reservations TO service_role;
GRANT ALL ON public.stock_movements TO service_role;
GRANT ALL ON public.document_revisions TO service_role;
GRANT ALL ON public.project_work_packages TO service_role;
GRANT ALL ON public.fusion_joints TO service_role;
GRANT ALL ON public.project_handover_records TO service_role;
GRANT ALL ON public.warranty_assets TO service_role;
GRANT ALL ON public.service_tickets TO service_role;
GRANT ALL ON public.business_audit_events TO service_role;
GRANT ALL ON public.management_configuration TO service_role;

ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fusion_joints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_configuration ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['product_specifications','sales_orders','inventory_reservations','stock_movements','document_revisions','project_work_packages','fusion_joints','project_handover_records','warranty_assets','service_tickets','business_audit_events','management_configuration'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Members can view %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Members can view %s" ON public.%I FOR SELECT USING (is_member_of_org(auth.uid(), organization_id))', t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Members can view sales order items" ON public.sales_order_items;
CREATE POLICY "Members can view sales order items" ON public.sales_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_items.sales_order_id AND is_member_of_org(auth.uid(), o.organization_id)));
DROP POLICY IF EXISTS "Authorized users can manage sales orders" ON public.sales_orders;
CREATE POLICY "Authorized users can manage sales orders" ON public.sales_orders FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance'));
DROP POLICY IF EXISTS "Authorized users can manage sales order items" ON public.sales_order_items;
CREATE POLICY "Authorized users can manage sales order items" ON public.sales_order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_items.sales_order_id AND (has_org_role(auth.uid(), o.organization_id, 'administrator') OR has_org_role(auth.uid(), o.organization_id, 'reception_sales') OR has_org_role(auth.uid(), o.organization_id, 'finance')))) WITH CHECK (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_items.sales_order_id AND (has_org_role(auth.uid(), o.organization_id, 'administrator') OR has_org_role(auth.uid(), o.organization_id, 'reception_sales') OR has_org_role(auth.uid(), o.organization_id, 'finance'))));
DROP POLICY IF EXISTS "Warehouse and admins manage reservations" ON public.inventory_reservations;
CREATE POLICY "Warehouse and admins manage reservations" ON public.inventory_reservations FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR has_org_role(auth.uid(), organization_id, 'reception_sales')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR has_org_role(auth.uid(), organization_id, 'reception_sales'));
DROP POLICY IF EXISTS "Warehouse and admins manage stock movements" ON public.stock_movements;
CREATE POLICY "Warehouse and admins manage stock movements" ON public.stock_movements FOR INSERT WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse'));
DROP POLICY IF EXISTS "Authorized users manage project work packages" ON public.project_work_packages;
CREATE POLICY "Authorized users manage project work packages" ON public.project_work_packages FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer'));
DROP POLICY IF EXISTS "Technical users manage fusion joints" ON public.fusion_joints;
CREATE POLICY "Technical users manage fusion joints" ON public.fusion_joints FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician'));
DROP POLICY IF EXISTS "Authorized users manage service tickets" ON public.service_tickets;
CREATE POLICY "Authorized users manage service tickets" ON public.service_tickets FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician'));
DROP POLICY IF EXISTS "Members can insert audit events" ON public.business_audit_events;
CREATE POLICY "Members can insert audit events" ON public.business_audit_events FOR INSERT WITH CHECK (is_member_of_org(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Admins can manage management configuration" ON public.management_configuration;
CREATE POLICY "Admins can manage management configuration" ON public.management_configuration FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator'));

CREATE OR REPLACE FUNCTION public.create_document_revision(
  _org_id uuid,
  _entity_type text,
  _entity_id uuid,
  _snapshot jsonb,
  _reason text
) RETURNS public.document_revisions
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result public.document_revisions;
BEGIN
  IF NOT is_member_of_org(auth.uid(), _org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;
  UPDATE public.document_revisions SET is_current = false WHERE organization_id = _org_id AND entity_type = _entity_type AND entity_id = _entity_id AND is_current = true;
  INSERT INTO public.document_revisions (organization_id, entity_type, entity_id, revision_number, is_current, snapshot, changed_by, change_reason)
  SELECT _org_id, _entity_type, _entity_id, COALESCE(MAX(revision_number), 0) + 1, true, _snapshot, auth.uid(), _reason
  FROM public.document_revisions WHERE organization_id = _org_id AND entity_type = _entity_type AND entity_id = _entity_id
  RETURNING * INTO result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, reason, source)
  VALUES (_org_id, auth.uid(), 'document_revision_created', _entity_type, _entity_id, _snapshot, _reason, 'create_document_revision');
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_document_revision(uuid, text, uuid, jsonb, text) TO authenticated;

DROP POLICY IF EXISTS "Commercial users manage product specifications" ON public.product_specifications;
CREATE POLICY "Commercial users manage product specifications" ON public.product_specifications FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'warehouse')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'warehouse'));
DROP POLICY IF EXISTS "Authorized users manage handover records" ON public.project_handover_records;
CREATE POLICY "Authorized users manage handover records" ON public.project_handover_records FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'finance')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'finance'));
DROP POLICY IF EXISTS "Authorized users manage warranty assets" ON public.warranty_assets;
CREATE POLICY "Authorized users manage warranty assets" ON public.warranty_assets FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'technician')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'technician'));

CREATE OR REPLACE FUNCTION public.create_sales_order_from_quotation(_org_id uuid, _quotation_id uuid, _notes text DEFAULT NULL)
RETURNS public.sales_orders
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  q public.quotations;
  result public.sales_orders;
  order_no text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN
    RAISE EXCEPTION 'Not authorized to create a sales order';
  END IF;
  SELECT * INTO q FROM public.quotations WHERE id = _quotation_id AND organization_id = _org_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quotation not found'; END IF;
  IF q.status <> 'accepted' THEN RAISE EXCEPTION 'Only an accepted quotation can become a sales order'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_orders WHERE organization_id = _org_id AND quotation_id = _quotation_id AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'A sales order already exists for this quotation';
  END IF;
  SELECT next_doc_number(_org_id, 'sales_orders') INTO order_no;
  INSERT INTO public.sales_orders (organization_id, order_number, client_id, opportunity_id, quotation_id, status, subtotal, total_amount, notes, created_by)
  VALUES (_org_id, order_no, q.client_id, NULL, q.id, 'draft', COALESCE(q.subtotal, 0), COALESCE(q.total_amount, 0), _notes, auth.uid())
  RETURNING * INTO result;
  INSERT INTO public.sales_order_items (sales_order_id, description, quantity, unit, unit_price, total_price, configurable_attributes)
  SELECT result.id, qi.description, qi.quantity, 'each', qi.unit_price, qi.total_price,
         jsonb_build_object('item_type', qi.item_type, 'source_quotation_item_id', qi.id)
  FROM public.quotation_items qi WHERE qi.quotation_id = q.id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_quotation', 'sales_order', result.id, jsonb_build_object('quotation_id', q.id, 'quotation_number', q.quotation_number), 'create_sales_order_from_quotation');
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sales_order_from_quotation(uuid, uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Authorized users manage document revisions" ON public.document_revisions;
CREATE POLICY "Authorized users manage document revisions" ON public.document_revisions FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'finance'));