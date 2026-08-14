-- Worker claim to payable connector.
-- Finance explicitly selects the accounting payment type; no category mapping is invented.

ALTER TABLE public.worker_payments
  ADD COLUMN IF NOT EXISTS claim_id uuid REFERENCES public.worker_claims(id) ON DELETE SET NULL;

ALTER TABLE public.worker_claims
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.worker_payments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_payments_claim_unique
  ON public.worker_payments(claim_id)
  WHERE claim_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_worker_payment_from_claim(
  _org_id uuid,
  _claim_id uuid,
  _payment_type public.payment_type,
  _payment_date date DEFAULT current_date,
  _description text DEFAULT NULL
)
RETURNS public.worker_payments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  c public.worker_claims;
  p public.worker_payments;
BEGIN
  IF NOT (
    has_org_role(auth.uid(), _org_id, 'administrator')
    OR has_org_role(auth.uid(), _org_id, 'finance')
    OR is_maintenance_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to create worker claim payment';
  END IF;
  IF _payment_date IS NULL OR _payment_date > current_date THEN
    RAISE EXCEPTION 'Payment date cannot be in the future';
  END IF;

  SELECT * INTO c
  FROM public.worker_claims
  WHERE id = _claim_id AND organization_id = _org_id
  FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Worker claim not found';
  END IF;
  IF c.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved claims can create a payable';
  END IF;
  IF c.payment_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM public.worker_payments WHERE claim_id = _claim_id
  ) THEN
    RAISE EXCEPTION 'A payment already exists for this claim';
  END IF;
  IF COALESCE(c.amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Claim amount must be greater than zero';
  END IF;

  INSERT INTO public.worker_payments (
    organization_id, user_id, type, amount, description, date, created_by, claim_id
  ) VALUES (
    _org_id,
    c.user_id,
    _payment_type,
    c.amount,
    COALESCE(NULLIF(trim(_description), ''), 'Payment created from worker claim ' || COALESCE(c.document_number, c.id::text)),
    _payment_date,
    auth.uid(),
    _claim_id
  )
  RETURNING * INTO p;

  UPDATE public.worker_claims
  SET payment_id = p.id, updated_at = now()
  WHERE id = _claim_id;

  INSERT INTO public.business_audit_events (
    organization_id, actor_id, action, entity_type, entity_id,
    previous_value, new_value, source
  ) VALUES (
    _org_id, auth.uid(), 'payment_created', 'worker_claim', c.id,
    to_jsonb(c), jsonb_build_object('claim_id', c.id, 'payment_id', p.id, 'amount', p.amount, 'type', p.type),
    'create_worker_payment_from_claim'
  );

  RETURN p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_worker_payment_from_claim(uuid, uuid, public.payment_type, date, text) TO authenticated;

-- Native fleet workflow completion: retain an operational vehicle name alongside the legally identifying plate number.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS name text;

COMMENT ON COLUMN public.vehicles.name IS
  'Operational fleet name, such as a vehicle call sign or asset name; plate_number remains the legal registration identifier.';

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS manual_dispatch_reason text;

COMMENT ON COLUMN public.deliveries.manual_dispatch_reason IS
  'Required by the application for manually scheduled delivery exceptions that were not created from a confirmed sales order.';