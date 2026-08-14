-- Industrial procurement line-item connectors.
-- These functions keep PO/MR headers and their required items in one transaction.

CREATE OR REPLACE FUNCTION public.create_purchase_order_with_items(
  _org_id uuid,
  _vendor_id uuid,
  _project_id uuid DEFAULT NULL,
  _delivery_date date DEFAULT NULL,
  _notes text DEFAULT NULL,
  _items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_po_id uuid;
  v_item_count integer;
BEGIN
  IF NOT (
    has_org_role(auth.uid(), _org_id, 'administrator')
    OR has_org_role(auth.uid(), _org_id, 'finance')
    OR is_maintenance_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to create purchase orders';
  END IF;

  IF _vendor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = _vendor_id AND organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'A vendor from the active organization is required';
  END IF;

  IF jsonb_typeof(COALESCE(_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Purchase order items must be a JSON array';
  END IF;

  INSERT INTO public.purchase_orders (
    organization_id, vendor_id, project_id, status, total_amount, currency,
    notes, delivery_date, created_by
  )
  SELECT
    _org_id,
    _vendor_id,
    _project_id,
    'draft',
    COALESCE(SUM(GREATEST(COALESCE(item.quantity, 0), 0) * GREATEST(COALESCE(item.unit_price, 0), 0)), 0),
    'NGN',
    NULLIF(trim(_notes), ''),
    _delivery_date,
    auth.uid()
  FROM jsonb_to_recordset(COALESCE(_items, '[]'::jsonb)) AS item(
    item_name text,
    description text,
    quantity numeric,
    unit text,
    unit_price numeric
  )
  WHERE NULLIF(trim(item.item_name), '') IS NOT NULL
    AND COALESCE(item.quantity, 0) > 0
  RETURNING id INTO v_po_id;

  IF v_po_id IS NULL THEN
    RAISE EXCEPTION 'At least one valid purchase-order item is required';
  END IF;

  INSERT INTO public.purchase_order_items (
    purchase_order_id, item_name, description, quantity, unit, unit_price, total_price
  )
  SELECT
    v_po_id,
    trim(item.item_name),
    NULLIF(trim(item.description), ''),
    item.quantity,
    NULLIF(trim(item.unit), ''),
    GREATEST(COALESCE(item.unit_price, 0), 0),
    GREATEST(item.quantity, 0) * GREATEST(COALESCE(item.unit_price, 0), 0)
  FROM jsonb_to_recordset(COALESCE(_items, '[]'::jsonb)) AS item(
    item_name text,
    description text,
    quantity numeric,
    unit text,
    unit_price numeric
  )
  WHERE NULLIF(trim(item.item_name), '') IS NOT NULL
    AND COALESCE(item.quantity, 0) > 0;

  GET DIAGNOSTICS v_item_count = ROW_COUNT;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'At least one valid purchase-order item is required';
  END IF;

  RETURN v_po_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_purchase_order_with_items(uuid, uuid, uuid, date, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_material_requisition_with_items(
  _org_id uuid,
  _project_id uuid DEFAULT NULL,
  _required_date date DEFAULT NULL,
  _notes text DEFAULT NULL,
  _items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_mr_id uuid;
  v_item_count integer;
BEGIN
  IF NOT (is_member_of_org(auth.uid(), _org_id) OR is_maintenance_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to create material requisitions';
  END IF;

  IF jsonb_typeof(COALESCE(_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Material-requisition items must be a JSON array';
  END IF;

  INSERT INTO public.material_requisitions (
    organization_id, project_id, status, requested_by, required_date, notes
  )
  VALUES (
    _org_id, _project_id, 'draft', auth.uid(), _required_date, NULLIF(trim(_notes), '')
  )
  RETURNING id INTO v_mr_id;

  INSERT INTO public.mr_items (mr_id, inventory_id, item_name, quantity_requested, unit)
  SELECT
    v_mr_id,
    item.inventory_id,
    trim(item.item_name),
    item.quantity,
    NULLIF(trim(item.unit), '')
  FROM jsonb_to_recordset(COALESCE(_items, '[]'::jsonb)) AS item(
    inventory_id uuid,
    item_name text,
    quantity numeric,
    unit text
  )
  WHERE NULLIF(trim(item.item_name), '') IS NOT NULL
    AND COALESCE(item.quantity, 0) > 0;

  GET DIAGNOSTICS v_item_count = ROW_COUNT;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'At least one valid material-requisition item is required';
  END IF;

  RETURN v_mr_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_material_requisition_with_items(uuid, uuid, date, text, jsonb) TO authenticated;
