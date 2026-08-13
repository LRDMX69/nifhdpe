-- NIFHDPE complete transactional connectors.
-- Additive and policy-neutral: commercial/accounting/technical rules are configurable.

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_of_delivery jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS lot_batch text;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS accepted_quantity numeric NOT NULL DEFAULT 0 CHECK (accepted_quantity >= 0);
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS rejected_quantity numeric NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0);
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS remaining_quantity numeric NOT NULL DEFAULT 0 CHECK (remaining_quantity >= 0);
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS lot_batch text;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS storage_location_id uuid REFERENCES public.storage_locations(id) ON DELETE SET NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS lot_batch text;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reserved_quantity numeric NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0);
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS work_package_id uuid REFERENCES public.project_work_packages(id) ON DELETE SET NULL;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS client_signoff jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.procurement_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  sales_order_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity_required numeric NOT NULL CHECK (quantity_required > 0),
  quantity_sourced numeric NOT NULL DEFAULT 0 CHECK (quantity_sourced >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_sourced','sourced','cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  sales_order_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.inventory_reservations(id) ON DELETE SET NULL,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  lot_batch text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_material_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  work_package_id uuid REFERENCES public.project_work_packages(id) ON DELETE SET NULL,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  lot_batch text,
  quantity numeric NOT NULL CHECK (quantity > 0),
  field_report_id uuid REFERENCES public.field_reports(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_equipment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  work_package_id uuid REFERENCES public.project_work_packages(id) ON DELETE SET NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
  field_report_id uuid REFERENCES public.field_reports(id) ON DELETE SET NULL,
  assigned_from timestamptz NOT NULL DEFAULT now(),
  assigned_to timestamptz,
  hours numeric CHECK (hours IS NULL OR hours >= 0),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_qa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  work_package_id uuid REFERENCES public.project_work_packages(id) ON DELETE SET NULL,
  field_report_id uuid REFERENCES public.field_reports(id) ON DELETE SET NULL,
  inspection_type text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  result text NOT NULL DEFAULT 'awaiting_configuration' CHECK (result IN ('awaiting_configuration','pass','fail','rework','not_applicable')),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  inspected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_ticket_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procurement_demands_org_status ON public.procurement_demands(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON public.delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_project ON public.project_material_consumptions(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_project ON public.project_equipment_assignments(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_qa_project ON public.project_qa_records(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_service_parts_ticket ON public.service_ticket_parts(service_ticket_id);
CREATE INDEX IF NOT EXISTS idx_inventory_spec_lot ON public.inventory(organization_id, product_specification_id, lot_batch);

CREATE OR REPLACE FUNCTION public.touch_complete_connector_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS touch_procurement_demands ON public.procurement_demands;
CREATE TRIGGER touch_procurement_demands BEFORE UPDATE ON public.procurement_demands FOR EACH ROW EXECUTE FUNCTION public.touch_complete_connector_updated_at();

ALTER TABLE public.procurement_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_qa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ticket_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view procurement demands" ON public.procurement_demands FOR SELECT USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Commercial and warehouse manage procurement demands" ON public.procurement_demands FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR has_org_role(auth.uid(), organization_id, 'finance')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'reception_sales') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR has_org_role(auth.uid(), organization_id, 'finance'));
CREATE POLICY "Members view delivery items" ON public.delivery_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_items.delivery_id AND is_member_of_org(auth.uid(), d.organization_id)));
CREATE POLICY "Warehouse manages delivery items" ON public.delivery_items FOR ALL USING (EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_items.delivery_id AND (has_org_role(auth.uid(), d.organization_id, 'administrator') OR has_org_role(auth.uid(), d.organization_id, 'warehouse') OR has_org_role(auth.uid(), d.organization_id, 'reception_sales')))) WITH CHECK (EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_items.delivery_id AND (has_org_role(auth.uid(), d.organization_id, 'administrator') OR has_org_role(auth.uid(), d.organization_id, 'warehouse') OR has_org_role(auth.uid(), d.organization_id, 'reception_sales'))));
CREATE POLICY "Technical users manage material consumption" ON public.project_material_consumptions FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician'));
CREATE POLICY "Technical users manage equipment assignments" ON public.project_equipment_assignments FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician'));
CREATE POLICY "Technical users manage QA records" ON public.project_qa_records FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician'));
CREATE POLICY "Technical users manage service ticket parts" ON public.service_ticket_parts FOR ALL USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician')) WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'engineer') OR has_org_role(auth.uid(), organization_id, 'technician'));

CREATE OR REPLACE FUNCTION public.confirm_sales_order(_org_id uuid, _order_id uuid)
RETURNS public.sales_orders
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  o public.sales_orders;
  item public.sales_order_items;
  inv public.inventory;
  available numeric;
  remaining numeric;
  reserved numeric;
  result public.sales_orders;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to confirm this order'; END IF;
  SELECT * INTO o FROM public.sales_orders WHERE id = _order_id AND organization_id = _org_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Sales order not found'; END IF;
  IF o.status <> 'draft' THEN RAISE EXCEPTION 'Only draft orders can be confirmed'; END IF;
  FOR item IN SELECT * FROM public.sales_order_items WHERE sales_order_id = _order_id LOOP
    remaining := item.quantity - COALESCE(item.fulfilled_quantity, 0);
    IF item.product_specification_id IS NOT NULL THEN
      FOR inv IN SELECT * FROM public.inventory WHERE organization_id = _org_id AND product_specification_id = item.product_specification_id AND COALESCE(quantity_meters, 0) > 0 ORDER BY created_at FOR UPDATE LOOP
        SELECT COALESCE(SUM(r.quantity), 0) INTO reserved FROM public.inventory_reservations r WHERE r.inventory_id = inv.id AND r.status = 'reserved';
        available := GREATEST(0, COALESCE(inv.quantity_meters, 0) - reserved);
        IF available > 0 AND remaining > 0 THEN
          reserved := LEAST(available, remaining);
          INSERT INTO public.inventory_reservations (organization_id, sales_order_id, project_id, product_specification_id, inventory_id, quantity, lot_batch, status, reserved_by)
          VALUES (_org_id, _order_id, o.project_id, item.product_specification_id, inv.id, reserved, inv.lot_batch, 'reserved', auth.uid());
          INSERT INTO public.stock_movements (organization_id, product_specification_id, inventory_id, movement_type, quantity, lot_batch, sales_order_id, project_id, reason, created_by)
          VALUES (_org_id, item.product_specification_id, inv.id, 'reservation', reserved, inv.lot_batch, _order_id, o.project_id, 'Sales order confirmation', auth.uid());
          remaining := remaining - reserved;
        END IF;
        EXIT WHEN remaining <= 0;
      END LOOP;
    END IF;
    IF remaining > 0 THEN
      INSERT INTO public.procurement_demands (organization_id, sales_order_id, sales_order_item_id, project_id, product_specification_id, description, quantity_required, status, created_by)
      VALUES (_org_id, _order_id, item.id, o.project_id, item.product_specification_id, item.description, remaining, 'open', auth.uid());
    END IF;
  END LOOP;
  UPDATE public.sales_orders SET status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now() WHERE id = _order_id RETURNING * INTO result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'confirmed', 'sales_order', _order_id, to_jsonb(result), 'confirm_sales_order');
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_purchase_order_partial(_org_id uuid, _po_id uuid, _receipts jsonb)
RETURNS public.goods_received_notes
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  po public.purchase_orders;
  grn public.goods_received_notes;
  row jsonb;
  poi public.purchase_order_items;
  accepted numeric;
  rejected numeric;
  inv_id uuid;
  current_received numeric;
  remaining numeric;
  new_qty numeric;
  movement_spec uuid;
  movement_lot text;
  movement_location uuid;
  current_inventory public.inventory;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'warehouse') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to receive goods'; END IF;
  SELECT * INTO po FROM public.purchase_orders WHERE id = _po_id AND organization_id = _org_id FOR UPDATE;
  IF po.id IS NULL THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  INSERT INTO public.goods_received_notes (organization_id, purchase_order_id, vendor_id, received_by, status, received_date)
  VALUES (_org_id, _po_id, po.vendor_id, auth.uid(), 'pending', current_date) RETURNING * INTO grn;
  FOR row IN SELECT * FROM jsonb_array_elements(COALESCE(_receipts, '[]'::jsonb)) LOOP
    SELECT * INTO poi FROM public.purchase_order_items WHERE id = (row->>'purchase_order_item_id')::uuid AND purchase_order_id = _po_id FOR UPDATE;
    IF poi.id IS NULL THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;
    accepted := GREATEST(0, COALESCE((row->>'accepted_quantity')::numeric, 0));
    rejected := GREATEST(0, COALESCE((row->>'rejected_quantity')::numeric, 0));
    current_received := COALESCE(poi.received_quantity, 0);
    remaining := GREATEST(0, poi.quantity - current_received);
    IF accepted + rejected > remaining THEN RAISE EXCEPTION 'Receipt exceeds remaining quantity for %', poi.item_name; END IF;
    movement_spec := NULLIF(row->>'product_specification_id', '')::uuid;
    movement_lot := NULLIF(row->>'lot_batch', '');
    movement_location := NULLIF(row->>'storage_location_id', '')::uuid;
    inv_id := NULLIF(row->>'inventory_id', '')::uuid;
    IF accepted > 0 THEN
      IF inv_id IS NULL THEN
        INSERT INTO public.inventory (organization_id, item_name, item_type, quantity_meters, unit_cost, location_id, product_specification_id, lot_batch, notes)
        VALUES (_org_id, poi.item_name, 'custom', accepted, poi.unit_price, movement_location, movement_spec, movement_lot, 'Created from partial goods receipt') RETURNING id INTO inv_id;
      ELSE
        SELECT * INTO current_inventory FROM public.inventory WHERE id = inv_id AND organization_id = _org_id FOR UPDATE;
        IF current_inventory.id IS NULL THEN RAISE EXCEPTION 'Inventory record not found'; END IF;
        UPDATE public.inventory SET quantity_meters = COALESCE(quantity_meters, 0) + accepted, updated_at = now() WHERE id = inv_id;
      END IF;
      INSERT INTO public.stock_movements (organization_id, product_specification_id, inventory_id, movement_type, quantity, lot_batch, to_location_id, purchase_order_id, reason, created_by)
      VALUES (_org_id, movement_spec, inv_id, 'receipt', accepted, movement_lot, movement_location, _po_id, 'Partial goods receipt', auth.uid());
    END IF;
    INSERT INTO public.grn_items (grn_id, purchase_order_item_id, item_name, quantity_received, accepted_quantity, rejected_quantity, remaining_quantity, condition, lot_batch, product_specification_id, inventory_id, storage_location_id)
    VALUES (grn.id, poi.id, poi.item_name, accepted + rejected, accepted, rejected, remaining - accepted - rejected, COALESCE(row->>'condition', 'good'), movement_lot, movement_spec, inv_id, movement_location);
    new_qty := current_received + accepted + rejected;
    UPDATE public.purchase_order_items SET received_quantity = new_qty WHERE id = poi.id;
  END LOOP;
  UPDATE public.goods_received_notes SET status = 'accepted' WHERE id = grn.id;
  IF NOT EXISTS (SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id = _po_id AND COALESCE(received_quantity, 0) < quantity) THEN
    UPDATE public.purchase_orders SET status = 'received' WHERE id = _po_id;
  ELSE
    UPDATE public.purchase_orders SET status = 'partially_received' WHERE id = _po_id;
  END IF;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'partial_receipt_posted', 'goods_received_note', grn.id, to_jsonb(grn), 'receive_purchase_order_partial');
  RETURN grn;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_delivery_from_sales_order(_org_id uuid, _order_id uuid, _destination text, _site_name text DEFAULT NULL, _project_id uuid DEFAULT NULL)
RETURNS public.deliveries
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  o public.sales_orders;
  d public.deliveries;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'warehouse') OR has_org_role(auth.uid(), _org_id, 'reception_sales')) THEN RAISE EXCEPTION 'Not authorized to create delivery'; END IF;
  SELECT * INTO o FROM public.sales_orders WHERE id = _order_id AND organization_id = _org_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Sales order not found'; END IF;
  IF o.status NOT IN ('confirmed','partially_fulfilled') THEN RAISE EXCEPTION 'Order must be confirmed before delivery'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.inventory_reservations WHERE sales_order_id = _order_id AND status = 'reserved') THEN RAISE EXCEPTION 'No reserved inventory is available for this order'; END IF;
  INSERT INTO public.deliveries (organization_id, created_by, project_id, sales_order_id, client_id, destination, site_name, status, delivery_date, notes)
  VALUES (_org_id, auth.uid(), COALESCE(_project_id, o.project_id), _order_id, o.client_id, _destination, _site_name, 'pending', current_date, 'Created from sales order') RETURNING * INTO d;
  INSERT INTO public.delivery_items (delivery_id, sales_order_item_id, reservation_id, product_specification_id, inventory_id, quantity, lot_batch)
  SELECT d.id, soi.id, r.id, r.product_specification_id, r.inventory_id, r.quantity, r.lot_batch
  FROM public.inventory_reservations r
  LEFT JOIN public.sales_order_items soi ON soi.sales_order_id = _order_id AND soi.product_specification_id = r.product_specification_id
  WHERE r.sales_order_id = _order_id AND r.status = 'reserved';
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_sales_order', 'delivery', d.id, jsonb_build_object('sales_order_id', _order_id), 'create_delivery_from_sales_order');
  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_delivery(_org_id uuid, _delivery_id uuid, _proof_of_delivery jsonb DEFAULT '{}'::jsonb)
RETURNS public.deliveries
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  d public.deliveries;
  di public.delivery_items;
  result public.deliveries;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'warehouse') OR has_org_role(auth.uid(), _org_id, 'reception_sales')) THEN RAISE EXCEPTION 'Not authorized to complete delivery'; END IF;
  SELECT * INTO d FROM public.deliveries WHERE id = _delivery_id AND organization_id = _org_id FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF d.status = 'delivered' THEN RETURN d; END IF;
  FOR di IN SELECT * FROM public.delivery_items WHERE delivery_id = _delivery_id LOOP
    IF di.inventory_id IS NOT NULL THEN
      UPDATE public.inventory SET quantity_meters = GREATEST(0, COALESCE(quantity_meters, 0) - di.quantity), reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - di.quantity), updated_at = now() WHERE id = di.inventory_id AND organization_id = _org_id;
    END IF;
    UPDATE public.inventory_reservations SET status = 'fulfilled', released_at = now() WHERE id = di.reservation_id AND organization_id = _org_id;
    INSERT INTO public.stock_movements (organization_id, product_specification_id, inventory_id, movement_type, quantity, lot_batch, sales_order_id, delivery_id, project_id, reason, created_by)
    SELECT _org_id, di.product_specification_id, di.inventory_id, 'issue', di.quantity, di.lot_batch, d.sales_order_id, d.id, d.project_id, 'Delivery completed', auth.uid();
    UPDATE public.sales_order_items SET fulfilled_quantity = LEAST(quantity, fulfilled_quantity + di.quantity) WHERE id = di.sales_order_item_id;
  END LOOP;
  UPDATE public.deliveries SET status = 'delivered', delivered_at = now(), proof_of_delivery = COALESCE(_proof_of_delivery, '{}'::jsonb) WHERE id = _delivery_id RETURNING * INTO result;
  IF d.sales_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sales_order_items WHERE sales_order_id = d.sales_order_id AND fulfilled_quantity < quantity) THEN UPDATE public.sales_orders SET status = 'fulfilled' WHERE id = d.sales_order_id; END IF;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'completed', 'delivery', d.id, to_jsonb(result), 'complete_delivery');
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invoice_from_sales_order(_org_id uuid, _order_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  o public.sales_orders;
  inv public.invoices;
  invoice_no text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to create invoice'; END IF;
  SELECT * INTO o FROM public.sales_orders WHERE id = _order_id AND organization_id = _org_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Sales order not found'; END IF;
  IF o.status NOT IN ('confirmed','partially_fulfilled','fulfilled') THEN RAISE EXCEPTION 'Order is not ready for invoicing'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE sales_order_id = _order_id AND status <> 'cancelled') THEN RAISE EXCEPTION 'An invoice already exists for this order'; END IF;
  SELECT next_doc_number(_org_id, 'invoices') INTO invoice_no;
  INSERT INTO public.invoices (organization_id, document_number, client_id, quotation_id, sales_order_id, project_id, subtotal, total_amount, balance_due, status, created_by, invoice_date)
  VALUES (_org_id, invoice_no, o.client_id, o.quotation_id, o.id, o.project_id, o.subtotal, o.total_amount, o.total_amount, 'unpaid', auth.uid(), current_date) RETURNING * INTO inv;
  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, total_price)
  SELECT inv.id, description, quantity, unit_price, total_price FROM public.sales_order_items WHERE sales_order_id = _order_id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_sales_order', 'invoice', inv.id, jsonb_build_object('sales_order_id', _order_id), 'create_invoice_from_sales_order');
  RETURN inv;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(_org_id uuid, _invoice_id uuid, _amount numeric, _payment_method text DEFAULT NULL, _reference_number text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS public.receipts
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  inv public.invoices;
  receipt public.receipts;
  new_balance numeric;
  receipt_no text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to record payment'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be greater than zero'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id AND organization_id = _org_id FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF _amount > COALESCE(inv.balance_due, inv.total_amount, 0) THEN RAISE EXCEPTION 'Payment exceeds outstanding balance'; END IF;
  new_balance := GREATEST(0, COALESCE(inv.balance_due, inv.total_amount, 0) - _amount);
  SELECT next_doc_number(_org_id, 'receipts') INTO receipt_no;
  INSERT INTO public.receipts (organization_id, document_number, invoice_id, client_id, amount_received, payment_method, reference_number, notes, received_by, payment_date)
  VALUES (_org_id, receipt_no, inv.id, inv.client_id, _amount, _payment_method, _reference_number, _notes, auth.uid(), current_date) RETURNING * INTO receipt;
  UPDATE public.invoices SET balance_due = new_balance, status = CASE WHEN new_balance = 0 THEN 'paid' ELSE 'partially_paid' END WHERE id = inv.id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
  VALUES (_org_id, auth.uid(), 'payment_recorded', 'invoice', inv.id, to_jsonb(inv), jsonb_build_object('receipt_id', receipt.id, 'amount', _amount, 'balance_due', new_balance), 'record_invoice_payment');
  RETURN receipt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_sales_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order_partial(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_from_sales_order(uuid, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_sales_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, uuid, numeric, text, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.record_project_material_consumption(_org_id uuid, _project_id uuid, _work_package_id uuid, _inventory_id uuid, _quantity numeric, _field_report_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS public.project_material_consumptions
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  inv public.inventory;
  consumed public.project_material_consumptions;
  reserved numeric;
  available numeric;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'engineer') OR has_org_role(auth.uid(), _org_id, 'technician')) THEN RAISE EXCEPTION 'Not authorized to consume project material'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  SELECT * INTO inv FROM public.inventory WHERE id = _inventory_id AND organization_id = _org_id FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Inventory record not found'; END IF;
  SELECT COALESCE(SUM(r.quantity), 0) INTO reserved FROM public.inventory_reservations r WHERE r.inventory_id = _inventory_id AND r.status = 'reserved';
  available := GREATEST(0, COALESCE(inv.quantity_meters, 0) - reserved);
  IF _quantity > available THEN RAISE EXCEPTION 'Consumption exceeds available stock'; END IF;
  INSERT INTO public.project_material_consumptions (organization_id, project_id, work_package_id, product_specification_id, inventory_id, lot_batch, quantity, field_report_id, created_by)
  VALUES (_org_id, _project_id, _work_package_id, inv.product_specification_id, inv.id, inv.lot_batch, _quantity, _field_report_id, auth.uid()) RETURNING * INTO consumed;
  UPDATE public.inventory SET quantity_meters = COALESCE(quantity_meters, 0) - _quantity, updated_at = now() WHERE id = inv.id;
  INSERT INTO public.stock_movements (organization_id, product_specification_id, inventory_id, movement_type, quantity, lot_batch, project_id, reason, created_by)
  VALUES (_org_id, inv.product_specification_id, inv.id, 'issue', _quantity, inv.lot_batch, _project_id, COALESCE(_notes, 'Project material consumption'), auth.uid());
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'material_consumed', 'project_material_consumption', consumed.id, to_jsonb(consumed), 'record_project_material_consumption');
  RETURN consumed;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_project_handover(_org_id uuid, _project_id uuid, _qa_summary jsonb DEFAULT '{}'::jsonb, _client_signoff jsonb DEFAULT '{}'::jsonb)
RETURNS public.project_handover_records
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  project_row public.projects;
  h public.project_handover_records;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'engineer') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to submit handover'; END IF;
  SELECT * INTO project_row FROM public.projects WHERE id = _project_id AND organization_id = _org_id;
  IF project_row.id IS NULL THEN RAISE EXCEPTION 'Project not found'; END IF;
  INSERT INTO public.project_handover_records (organization_id, project_id, client_id, status, qa_summary, client_signoff, created_by)
  VALUES (_org_id, _project_id, project_row.client_id, 'pending_client_signoff', COALESCE(_qa_summary, '{}'::jsonb), COALESCE(_client_signoff, '{}'::jsonb), auth.uid())
  ON CONFLICT (project_id) DO UPDATE SET status = 'pending_client_signoff', qa_summary = EXCLUDED.qa_summary, client_signoff = EXCLUDED.client_signoff, updated_at = now()
  RETURNING * INTO h;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'submitted_for_client_signoff', 'project_handover', h.id, to_jsonb(h), 'submit_project_handover');
  RETURN h;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_service_ticket(_org_id uuid, _ticket_id uuid, _resolution text, _parts jsonb DEFAULT '[]'::jsonb)
RETURNS public.service_tickets
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  t public.service_tickets;
  result public.service_tickets;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'engineer') OR has_org_role(auth.uid(), _org_id, 'technician')) THEN RAISE EXCEPTION 'Not authorized to resolve service ticket'; END IF;
  IF COALESCE(trim(_resolution), '') = '' THEN RAISE EXCEPTION 'Resolution is required'; END IF;
  SELECT * INTO t FROM public.service_tickets WHERE id = _ticket_id AND organization_id = _org_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Service ticket not found'; END IF;
  UPDATE public.service_tickets SET status = 'resolved', resolution = _resolution, parts_used = COALESCE(_parts, '[]'::jsonb), resolved_at = now(), updated_at = now() WHERE id = _ticket_id RETURNING * INTO result;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, source)
  VALUES (_org_id, auth.uid(), 'resolved', 'service_ticket', _ticket_id, to_jsonb(t), to_jsonb(result), 'resolve_service_ticket');
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_project_material_consumption(uuid, uuid, uuid, uuid, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_handover(uuid, uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_service_ticket(uuid, uuid, text, jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.capture_operational_document_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_entity_id uuid;
  v_entity_type text;
  v_old_snapshot jsonb;
  v_new_snapshot jsonb;
  v_reason text;
  v_next_revision integer;
BEGIN
  v_org_id := (to_jsonb(OLD)->>'organization_id')::uuid;
  v_entity_id := OLD.id;
  v_entity_type := CASE TG_TABLE_NAME WHEN 'purchase_orders' THEN 'purchase_order' WHEN 'invoices' THEN 'invoice' WHEN 'deliveries' THEN 'delivery' WHEN 'projects' THEN 'project' WHEN 'field_reports' THEN 'field_report' ELSE TG_TABLE_NAME END;
  IF v_org_id IS NULL OR v_entity_id IS NULL THEN RETURN NEW; END IF;
  v_old_snapshot := to_jsonb(OLD);
  v_new_snapshot := to_jsonb(NEW);
  v_reason := COALESCE(v_new_snapshot->>'revision_reason', 'Automatic snapshot before operational update');
  UPDATE public.document_revisions SET is_current = false WHERE document_revisions.organization_id = v_org_id AND document_revisions.entity_type = v_entity_type AND document_revisions.entity_id = v_entity_id AND document_revisions.is_current = true;
  SELECT COALESCE(MAX(document_revisions.revision_number), 0) + 1 INTO v_next_revision FROM public.document_revisions WHERE document_revisions.organization_id = v_org_id AND document_revisions.entity_type = v_entity_type AND document_revisions.entity_id = v_entity_id;
  INSERT INTO public.document_revisions (organization_id, entity_type, entity_id, revision_number, is_current, snapshot, changed_by, change_reason)
  VALUES (v_org_id, v_entity_type, v_entity_id, v_next_revision, false, v_old_snapshot, auth.uid(), v_reason);
  INSERT INTO public.document_revisions (organization_id, entity_type, entity_id, revision_number, is_current, snapshot, changed_by, change_reason)
  VALUES (v_org_id, v_entity_type, v_entity_id, v_next_revision + 1, true, v_new_snapshot, auth.uid(), 'Current revision after update');
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, previous_value, new_value, reason, source)
  VALUES (v_org_id, auth.uid(), 'operational_document_updated', v_entity_type, v_entity_id, v_old_snapshot, v_new_snapshot, v_reason, 'capture_operational_document_revision');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_invoice_revision ON public.invoices;
CREATE TRIGGER capture_invoice_revision AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.capture_operational_document_revision();
DROP TRIGGER IF EXISTS capture_purchase_order_revision ON public.purchase_orders;
CREATE TRIGGER capture_purchase_order_revision AFTER UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.capture_operational_document_revision();
DROP TRIGGER IF EXISTS capture_delivery_revision ON public.deliveries;
CREATE TRIGGER capture_delivery_revision AFTER UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.capture_operational_document_revision();
DROP TRIGGER IF EXISTS capture_project_revision ON public.projects;
CREATE TRIGGER capture_project_revision AFTER UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.capture_operational_document_revision();
DROP TRIGGER IF EXISTS capture_field_report_revision ON public.field_reports;
CREATE TRIGGER capture_field_report_revision AFTER UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.capture_operational_document_revision();

ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_sales_order_from_quotation(_org_id uuid, _quotation_id uuid, _notes text DEFAULT NULL)
RETURNS public.sales_orders
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  q public.quotations;
  result public.sales_orders;
  order_no text;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'reception_sales') OR has_org_role(auth.uid(), _org_id, 'finance')) THEN RAISE EXCEPTION 'Not authorized to create a sales order'; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = _quotation_id AND organization_id = _org_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quotation not found'; END IF;
  IF q.status <> 'accepted' THEN RAISE EXCEPTION 'Only an accepted quotation can become a sales order'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_orders WHERE organization_id = _org_id AND quotation_id = _quotation_id AND status <> 'cancelled') THEN RAISE EXCEPTION 'A sales order already exists for this quotation'; END IF;
  SELECT next_doc_number(_org_id, 'sales_orders') INTO order_no;
  INSERT INTO public.sales_orders (organization_id, order_number, client_id, opportunity_id, quotation_id, status, subtotal, total_amount, notes, created_by)
  VALUES (_org_id, order_no, q.client_id, q.opportunity_id, q.id, 'draft', COALESCE(q.subtotal, 0), COALESCE(q.total_amount, 0), _notes, auth.uid()) RETURNING * INTO result;
  INSERT INTO public.sales_order_items (sales_order_id, product_specification_id, description, quantity, unit, unit_price, total_price, configurable_attributes)
  SELECT result.id, qi.product_specification_id, qi.description, qi.quantity, 'each', qi.unit_price, qi.total_price, jsonb_build_object('item_type', qi.item_type, 'source_quotation_item_id', qi.id)
  FROM public.quotation_items qi WHERE qi.quotation_id = q.id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_quotation', 'sales_order', result.id, jsonb_build_object('quotation_id', q.id, 'quotation_number', q.quotation_number, 'opportunity_id', q.opportunity_id), 'create_sales_order_from_quotation');
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_from_sales_order(_org_id uuid, _order_id uuid, _name text, _description text DEFAULT NULL)
RETURNS public.projects
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  o public.sales_orders;
  p public.projects;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'engineer') OR has_org_role(auth.uid(), _org_id, 'reception_sales')) THEN RAISE EXCEPTION 'Not authorized to create project'; END IF;
  IF COALESCE(trim(_name), '') = '' THEN RAISE EXCEPTION 'Project name is required'; END IF;
  SELECT * INTO o FROM public.sales_orders WHERE id = _order_id AND organization_id = _org_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Sales order not found'; END IF;
  IF o.project_id IS NOT NULL THEN SELECT * INTO p FROM public.projects WHERE id = o.project_id; RETURN p; END IF;
  INSERT INTO public.projects (organization_id, created_by, name, description, client_id, quotation_id, status, budget)
  VALUES (_org_id, auth.uid(), trim(_name), _description, o.client_id, o.quotation_id, 'planning', o.total_amount) RETURNING * INTO p;
  UPDATE public.sales_orders SET project_id = p.id WHERE id = o.id;
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'created_from_sales_order', 'project', p.id, jsonb_build_object('sales_order_id', o.id), 'create_project_from_sales_order');
  RETURN p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_project_from_sales_order(uuid, uuid, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_operational_dashboard(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_member_of_org(auth.uid(), _org_id) THEN RAISE EXCEPTION 'Not authorized to view operational dashboard'; END IF;
  SELECT jsonb_build_object(
    'pipeline', jsonb_build_object(
      'opportunities_total', (SELECT COUNT(*) FROM public.opportunities WHERE organization_id = _org_id),
      'opportunities_won', (SELECT COUNT(*) FROM public.opportunities WHERE organization_id = _org_id AND status = 'won'),
      'quotations_sent', (SELECT COUNT(*) FROM public.quotations WHERE organization_id = _org_id AND status IN ('sent','accepted','rejected')),
      'quotations_accepted', (SELECT COUNT(*) FROM public.quotations WHERE organization_id = _org_id AND status = 'accepted')
    ),
    'orders', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM public.sales_orders WHERE organization_id = _org_id),
      'draft', (SELECT COUNT(*) FROM public.sales_orders WHERE organization_id = _org_id AND status = 'draft'),
      'confirmed', (SELECT COUNT(*) FROM public.sales_orders WHERE organization_id = _org_id AND status IN ('confirmed','partially_fulfilled')),
      'fulfilled', (SELECT COUNT(*) FROM public.sales_orders WHERE organization_id = _org_id AND status = 'fulfilled')
    ),
    'inventory', jsonb_build_object(
      'sku_count', (SELECT COUNT(*) FROM public.inventory WHERE organization_id = _org_id),
      'low_stock_count', (SELECT COUNT(*) FROM public.inventory WHERE organization_id = _org_id AND min_stock_level IS NOT NULL AND COALESCE(quantity_meters, 0) < min_stock_level),
      'reserved_stock_count', (SELECT COUNT(*) FROM public.inventory_reservations WHERE organization_id = _org_id AND status = 'reserved')
    ),
    'receivables', jsonb_build_object(
      'billed', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE organization_id = _org_id AND status <> 'draft'), 0),
      'outstanding', COALESCE((SELECT SUM(balance_due) FROM public.invoices WHERE organization_id = _org_id AND status NOT IN ('paid','cancelled')), 0),
      'overdue_count', (SELECT COUNT(*) FROM public.invoices WHERE organization_id = _org_id AND COALESCE(balance_due, 0) > 0 AND due_date IS NOT NULL AND due_date < current_date)
    ),
    'projects', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM public.projects WHERE organization_id = _org_id),
      'in_progress', (SELECT COUNT(*) FROM public.projects WHERE organization_id = _org_id AND status = 'in_progress'),
      'completed', (SELECT COUNT(*) FROM public.projects WHERE organization_id = _org_id AND status = 'completed')
    ),
    'quality', jsonb_build_object(
      'fusion_total', (SELECT COUNT(*) FROM public.fusion_joints WHERE organization_id = _org_id),
      'fusion_passed', (SELECT COUNT(*) FROM public.fusion_joints WHERE organization_id = _org_id AND result = 'pass'),
      'qa_open', (SELECT COUNT(*) FROM public.project_qa_records WHERE organization_id = _org_id AND result IN ('awaiting_configuration','rework','fail'))
    ),
    'logistics', jsonb_build_object(
      'pending_deliveries', (SELECT COUNT(*) FROM public.deliveries WHERE organization_id = _org_id AND status = 'pending'),
      'in_transit', (SELECT COUNT(*) FROM public.deliveries WHERE organization_id = _org_id AND status = 'in_transit'),
      'delivered', (SELECT COUNT(*) FROM public.deliveries WHERE organization_id = _org_id AND status = 'delivered')
    ),
    'procurement', jsonb_build_object(
      'open_demands', (SELECT COUNT(*) FROM public.procurement_demands WHERE organization_id = _org_id AND status IN ('open','partially_sourced')),
      'purchase_orders_open', (SELECT COUNT(*) FROM public.purchase_orders WHERE organization_id = _org_id AND status NOT IN ('received','cancelled','closed'))
    ),
    'service', jsonb_build_object(
      'open_tickets', (SELECT COUNT(*) FROM public.service_tickets WHERE organization_id = _org_id AND status NOT IN ('resolved','closed','rejected')),
      'urgent_tickets', (SELECT COUNT(*) FROM public.service_tickets WHERE organization_id = _org_id AND priority = 'urgent' AND status NOT IN ('resolved','closed','rejected'))
    )
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_operational_dashboard(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.assign_equipment_to_project(_org_id uuid, _equipment_id uuid, _project_id uuid, _hours numeric DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS public.project_equipment_assignments
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  eq public.equipment;
  assignment public.project_equipment_assignments;
BEGIN
  IF NOT (has_org_role(auth.uid(), _org_id, 'administrator') OR has_org_role(auth.uid(), _org_id, 'engineer') OR has_org_role(auth.uid(), _org_id, 'technician')) THEN RAISE EXCEPTION 'Not authorized to assign equipment'; END IF;
  SELECT * INTO eq FROM public.equipment WHERE id = _equipment_id AND organization_id = _org_id FOR UPDATE;
  IF eq.id IS NULL THEN RAISE EXCEPTION 'Equipment not found'; END IF;
  IF eq.status = 'retired' THEN RAISE EXCEPTION 'Retired equipment cannot be assigned'; END IF;
  INSERT INTO public.project_equipment_assignments (organization_id, project_id, equipment_id, hours, notes, created_by)
  VALUES (_org_id, _project_id, _equipment_id, _hours, _notes, auth.uid()) RETURNING * INTO assignment;
  UPDATE public.equipment SET current_site_project_id = _project_id, status = 'in_use', usage_hours = COALESCE(usage_hours, 0) + COALESCE(_hours, 0), updated_at = now() WHERE id = _equipment_id;
  INSERT INTO public.equipment_logs (equipment_id, log_type, description, logged_by)
  VALUES (_equipment_id, 'assignment', COALESCE(_notes, 'Assigned to project'), auth.uid());
  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'assigned_to_project', 'equipment', _equipment_id, jsonb_build_object('project_id', _project_id, 'assignment_id', assignment.id, 'hours', _hours), 'assign_equipment_to_project');
  RETURN assignment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_equipment_to_project(uuid, uuid, uuid, numeric, text) TO authenticated;
