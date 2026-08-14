-- Payment date connector. The original six-argument function remains available;
-- this overload lets the Finance dialog post the authoritative receipt date.

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  _org_id uuid,
  _invoice_id uuid,
  _amount numeric,
  _payment_method text DEFAULT NULL,
  _reference_number text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _payment_date date DEFAULT current_date
)
RETURNS public.receipts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  inv public.invoices;
  receipt public.receipts;
  new_balance numeric;
  receipt_no text;
BEGIN
  IF NOT (
    has_org_role(auth.uid(), _org_id, 'administrator')
    OR has_org_role(auth.uid(), _org_id, 'finance')
  ) THEN
    RAISE EXCEPTION 'Not authorized to record payment';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF _payment_date IS NULL OR _payment_date > current_date THEN
    RAISE EXCEPTION 'Payment date cannot be in the future';
  END IF;

  SELECT * INTO inv
  FROM public.invoices
  WHERE id = _invoice_id AND organization_id = _org_id
  FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF _amount > COALESCE(inv.balance_due, inv.total_amount, 0) THEN
    RAISE EXCEPTION 'Payment exceeds outstanding balance';
  END IF;

  new_balance := GREATEST(0, COALESCE(inv.balance_due, inv.total_amount, 0) - _amount);
  SELECT next_doc_number(_org_id, 'receipts') INTO receipt_no;

  INSERT INTO public.receipts (
    organization_id, document_number, invoice_id, client_id, amount_received,
    payment_method, reference_number, notes, received_by, payment_date
  ) VALUES (
    _org_id, receipt_no, inv.id, inv.client_id, _amount,
    _payment_method, _reference_number, _notes, auth.uid(), _payment_date
  ) RETURNING * INTO receipt;

  UPDATE public.invoices
  SET balance_due = new_balance,
      status = CASE WHEN new_balance = 0 THEN 'paid' ELSE 'partially_paid' END
  WHERE id = inv.id;

  INSERT INTO public.business_audit_events (
    organization_id, actor_id, action, entity_type, entity_id,
    previous_value, new_value, source
  ) VALUES (
    _org_id, auth.uid(), 'payment_recorded', 'invoice', inv.id,
    to_jsonb(inv),
    jsonb_build_object('receipt_id', receipt.id, 'amount', _amount, 'balance_due', new_balance, 'payment_date', _payment_date),
    'record_invoice_payment'
  );

  RETURN receipt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, uuid, numeric, text, text, text, date) TO authenticated;
