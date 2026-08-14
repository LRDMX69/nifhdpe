-- Inventory deletion guard: stock with reservations or movement history is not deletable.
-- Such records must remain available for traceability and be adjusted/retired by policy.

CREATE OR REPLACE FUNCTION public.delete_inventory_item_safely(
  _org_id uuid,
  _inventory_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_inventory public.inventory;
BEGIN
  IF NOT (
    has_org_role(auth.uid(), _org_id, 'administrator')
    OR has_org_role(auth.uid(), _org_id, 'warehouse')
    OR is_maintenance_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete inventory';
  END IF;

  SELECT * INTO v_inventory
  FROM public.inventory
  WHERE id = _inventory_id AND organization_id = _org_id
  FOR UPDATE;
  IF v_inventory.id IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.inventory_reservations
    WHERE organization_id = _org_id AND inventory_id = _inventory_id AND status = 'reserved'
  ) THEN
    RAISE EXCEPTION 'Inventory item has active reservations and cannot be deleted';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE organization_id = _org_id AND inventory_id = _inventory_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_material_consumptions
    WHERE organization_id = _org_id AND inventory_id = _inventory_id
  ) OR EXISTS (
    SELECT 1 FROM public.service_ticket_parts
    WHERE organization_id = _org_id AND inventory_id = _inventory_id
  ) THEN
    RAISE EXCEPTION 'Inventory item has operational history and cannot be deleted';
  END IF;

  DELETE FROM public.inventory
  WHERE id = _inventory_id AND organization_id = _org_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_inventory_item_safely(uuid, uuid) TO authenticated;