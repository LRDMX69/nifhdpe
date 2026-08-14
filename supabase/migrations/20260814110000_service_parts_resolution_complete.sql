-- Persist structured service parts whenever a service ticket is resolved.
-- The existing RPC already accepts _parts JSON; this adds the child-row ledger.

CREATE OR REPLACE FUNCTION public.resolve_service_ticket(
  _org_id uuid,
  _ticket_id uuid,
  _resolution text,
  _parts jsonb DEFAULT '[]'::jsonb
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  t public.service_tickets;
  result public.service_tickets;
  part jsonb;
  v_quantity numeric;
  v_unit_cost numeric;
BEGIN
  IF NOT (
    has_org_role(auth.uid(), _org_id, 'administrator')
    OR has_org_role(auth.uid(), _org_id, 'engineer')
    OR has_org_role(auth.uid(), _org_id, 'technician')
  ) THEN
    RAISE EXCEPTION 'Not authorized to resolve service ticket';
  END IF;
  IF COALESCE(trim(_resolution), '') = '' THEN
    RAISE EXCEPTION 'Resolution is required';
  END IF;
  IF jsonb_typeof(COALESCE(_parts, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Service parts must be a JSON array';
  END IF;

  SELECT * INTO t
  FROM public.service_tickets
  WHERE id = _ticket_id AND organization_id = _org_id
  FOR UPDATE;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Service ticket not found';
  END IF;

  DELETE FROM public.service_ticket_parts WHERE service_ticket_id = _ticket_id;

  FOR part IN SELECT value FROM jsonb_array_elements(COALESCE(_parts, '[]'::jsonb)) LOOP
    v_quantity := COALESCE((part->>'quantity')::numeric, 0);
    v_unit_cost := COALESCE((part->>'unit_cost')::numeric, 0);
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Service part quantity must be greater than zero';
    END IF;
    IF v_unit_cost < 0 THEN
      RAISE EXCEPTION 'Service part unit cost cannot be negative';
    END IF;
    IF (part->>'inventory_id') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.inventory
      WHERE id = (part->>'inventory_id')::uuid AND organization_id = _org_id
    ) THEN
      RAISE EXCEPTION 'Service part inventory record is outside the active organization';
    END IF;
    IF (part->>'product_specification_id') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.product_specifications
      WHERE id = (part->>'product_specification_id')::uuid AND organization_id = _org_id
    ) THEN
      RAISE EXCEPTION 'Service part product specification is outside the active organization';
    END IF;

    INSERT INTO public.service_ticket_parts (
      organization_id, service_ticket_id, product_specification_id,
      inventory_id, quantity, unit_cost, created_by
    ) VALUES (
      _org_id,
      _ticket_id,
      NULLIF(part->>'product_specification_id', '')::uuid,
      NULLIF(part->>'inventory_id', '')::uuid,
      v_quantity,
      v_unit_cost,
      auth.uid()
    );
  END LOOP;

  UPDATE public.service_tickets
  SET status = 'resolved',
      resolution = _resolution,
      parts_used = COALESCE(_parts, '[]'::jsonb),
      resolved_at = now(),
      updated_at = now()
  WHERE id = _ticket_id
  RETURNING * INTO result;

  INSERT INTO public.business_audit_events (
    organization_id, actor_id, action, entity_type, entity_id,
    previous_value, new_value, source
  ) VALUES (
    _org_id, auth.uid(), 'resolved', 'service_ticket', _ticket_id,
    to_jsonb(t), to_jsonb(result), 'resolve_service_ticket'
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_service_ticket(uuid, uuid, text, jsonb) TO authenticated;
