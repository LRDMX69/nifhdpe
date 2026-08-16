-- Keep waybill content connected to the authoritative delivery_items lineage.
-- This is safe for existing issued documents: only empty/generic snapshots are backfilled.

CREATE OR REPLACE FUNCTION public.issue_waybill(
  _org_id uuid,
  _payload jsonb,
  _delivery_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS public.waybills
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_waybill public.waybills;
  v_delivery public.deliveries;
  v_client_id uuid := NULLIF(_payload->>'client_id','')::uuid;
  v_project_id uuid := NULLIF(_payload->>'project_id','')::uuid;
  v_order_id uuid := NULLIF(_payload->>'sales_order_id','')::uuid;
  v_items jsonb := coalesce(_payload->'items','[]'::jsonb);
  v_delivery_items jsonb := '[]'::jsonb;
  v_order_items jsonb := '[]'::jsonb;
  v_number text;
BEGIN
  IF NOT (
    has_org_role(auth.uid(), _org_id, 'administrator')
    OR has_org_role(auth.uid(), _org_id, 'warehouse')
    OR has_org_role(auth.uid(), _org_id, 'reception_sales')
    OR is_maintenance_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to issue waybill';
  END IF;

  IF _delivery_id IS NOT NULL THEN
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = _delivery_id AND organization_id = _org_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found in organization'; END IF;

    v_client_id := coalesce(v_delivery.client_id, v_client_id);
    v_project_id := coalesce(v_delivery.project_id, v_project_id);
    v_order_id := coalesce(v_delivery.sales_order_id, v_order_id);

    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'description', coalesce(
          NULLIF(trim(concat_ws(' — ', ps.product_code, ps.product_name)), ''),
          NULLIF(trim(inv.item_name), ''),
          NULLIF(trim(soi.description), ''),
          'Dispatched material'
        ),
        'quantity', di.quantity,
        'unit', 'each'
      ) ORDER BY di.created_at, di.id
    ), '[]'::jsonb)
    INTO v_delivery_items
    FROM public.delivery_items di
    LEFT JOIN public.product_specifications ps ON ps.id = di.product_specification_id
    LEFT JOIN public.inventory inv ON inv.id = di.inventory_id
    LEFT JOIN public.sales_order_items soi ON soi.id = di.sales_order_item_id
    WHERE di.delivery_id = _delivery_id;

    IF jsonb_array_length(v_delivery_items) > 0 THEN
      v_items := v_delivery_items;
    ELSIF v_order_id IS NOT NULL THEN
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'description', trim(soi.description),
          'quantity', soi.quantity,
          'unit', 'each'
        ) ORDER BY soi.created_at, soi.id
      ), '[]'::jsonb)
      INTO v_order_items
      FROM public.sales_order_items soi
      WHERE soi.sales_order_id = v_order_id AND soi.quantity > 0;

      IF jsonb_array_length(v_order_items) > 0 THEN
        v_items := v_order_items;
      END IF;
    END IF;
  END IF;

  -- A repeat request for the same delivery must remain idempotent, but it may
  -- repair an older empty/generic snapshot from before delivery_items existed.
  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO v_waybill
    FROM public.waybills
    WHERE organization_id = _org_id AND idempotency_key = _idempotency_key
    FOR UPDATE;
    IF FOUND THEN
      IF jsonb_array_length(v_items) > 0
        AND (v_waybill.items = '[]'::jsonb OR v_waybill.items @> '[{"description":"Materials in transit"}]'::jsonb)
      THEN
        UPDATE public.waybills
        SET items = v_items,
            sales_order_id = coalesce(v_waybill.sales_order_id, v_order_id),
            client_id = coalesce(v_waybill.client_id, v_client_id),
            project_id = coalesce(v_waybill.project_id, v_project_id),
            updated_at = now()
        WHERE id = v_waybill.id AND organization_id = _org_id
        RETURNING * INTO v_waybill;
      END IF;
      RETURN v_waybill;
    END IF;
  END IF;

  IF coalesce(trim(_payload->>'driver'),'') = '' THEN RAISE EXCEPTION 'Driver name is required'; END IF;
  IF coalesce(trim(_payload->>'destination'),'') = '' THEN RAISE EXCEPTION 'Destination is required'; END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'At least one waybill item is required'; END IF;
  IF v_delivery.sales_order_id IS NOT NULL AND v_delivery_items = '[]'::jsonb AND v_order_items = '[]'::jsonb THEN
    RAISE EXCEPTION 'Confirmed-order delivery has no item lineage';
  END IF;
  IF v_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Waybill client not found in organization'; END IF;
  IF v_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sales_orders WHERE id = v_order_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Waybill sales order not found in organization'; END IF;
  IF v_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project_id AND organization_id = _org_id) THEN RAISE EXCEPTION 'Waybill project not found in organization'; END IF;

  v_number := public.next_doc_number(_org_id, 'waybills');
  INSERT INTO public.waybills (
    organization_id, document_number, delivery_id, sales_order_id, client_id, project_id,
    waybill_date, driver, vehicle, destination, destination_state, site_name, project_name,
    items, notes, issued_by, idempotency_key
  )
  VALUES (
    _org_id, v_number, _delivery_id, v_order_id, v_client_id, v_project_id,
    coalesce(NULLIF(_payload->>'date','')::date, current_date), trim(_payload->>'driver'),
    NULLIF(trim(_payload->>'vehicle'),''), trim(_payload->>'destination'),
    NULLIF(trim(_payload->>'destination_state'),''), NULLIF(trim(_payload->>'site_name'),''),
    NULLIF(trim(_payload->>'project_name'),''), v_items,
    NULLIF(trim(_payload->>'notes'),''), auth.uid(), _idempotency_key
  )
  RETURNING * INTO v_waybill;

  IF _delivery_id IS NOT NULL THEN
    UPDATE public.deliveries
    SET document_number = v_number, waybill_id = v_waybill.id
    WHERE id = _delivery_id AND organization_id = _org_id;
  END IF;

  INSERT INTO public.business_audit_events (organization_id, actor_id, action, entity_type, entity_id, new_value, source)
  VALUES (_org_id, auth.uid(), 'waybill_issued', 'waybill', v_waybill.id, to_jsonb(v_waybill), 'issue_waybill');
  RETURN v_waybill;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_waybill(uuid, jsonb, uuid, text) TO authenticated;

-- Repair already-issued generic snapshots without touching deliberate custom items.
WITH item_snapshots AS (
  SELECT
    w.id,
    d.sales_order_id,
    d.client_id,
    d.project_id,
    jsonb_agg(
      jsonb_build_object(
        'description', coalesce(
          NULLIF(trim(concat_ws(' — ', ps.product_code, ps.product_name)), ''),
          NULLIF(trim(inv.item_name), ''),
          NULLIF(trim(soi.description), ''),
          'Dispatched material'
        ),
        'quantity', di.quantity,
        'unit', 'each'
      ) ORDER BY di.created_at, di.id
    ) AS items
  FROM public.waybills w
  JOIN public.deliveries d ON d.id = w.delivery_id
  JOIN public.delivery_items di ON di.delivery_id = d.id
  LEFT JOIN public.product_specifications ps ON ps.id = di.product_specification_id
  LEFT JOIN public.inventory inv ON inv.id = di.inventory_id
  LEFT JOIN public.sales_order_items soi ON soi.id = di.sales_order_item_id
  GROUP BY w.id, d.sales_order_id, d.client_id, d.project_id
)
UPDATE public.waybills w
SET items = s.items,
    sales_order_id = coalesce(w.sales_order_id, s.sales_order_id),
    client_id = coalesce(w.client_id, s.client_id),
    project_id = coalesce(w.project_id, s.project_id),
    updated_at = now()
FROM item_snapshots s
WHERE w.id = s.id
  AND (w.items = '[]'::jsonb OR w.items @> '[{"description":"Materials in transit"}]'::jsonb);