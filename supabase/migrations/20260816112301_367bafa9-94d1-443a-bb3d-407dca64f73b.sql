-- Finance reporting must exclude cancelled invoices from operational totals.
-- Cancelled records remain queryable for audit history but must not inflate
-- revenue, invoice counts, receivables, ageing, or monthly reporting.

CREATE OR REPLACE FUNCTION public.get_finance_period_report(_org_id uuid, _from date, _to date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_member_of_org(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Not authorized to view finance report';
  END IF;

  IF _from IS NULL OR _to IS NULL OR _from > _to THEN
    RAISE EXCEPTION 'Invalid finance report date range';
  END IF;

  SELECT jsonb_build_object(
    'period', jsonb_build_object('from', _from, 'to', _to),
    'invoiced', COALESCE((
      SELECT SUM(total_amount)
      FROM public.invoices
      WHERE organization_id = _org_id
        AND COALESCE(invoice_date, created_at::date) BETWEEN _from AND _to
        AND status NOT IN ('draft', 'cancelled')
    ), 0),
    'collected', COALESCE((
      SELECT SUM(amount_received)
      FROM public.receipts
      WHERE organization_id = _org_id
        AND COALESCE(payment_date, created_at::date) BETWEEN _from AND _to
    ), 0),
    'operating_expenses', COALESCE((
      SELECT SUM(amount)
      FROM public.expenses
      WHERE organization_id = _org_id
        AND date BETWEEN _from AND _to
    ), 0),
    'worker_payments', COALESCE((
      SELECT SUM(amount)
      FROM public.worker_payments
      WHERE organization_id = _org_id
        AND date BETWEEN _from AND _to
    ), 0),
    'invoice_count', (
      SELECT COUNT(*)
      FROM public.invoices
      WHERE organization_id = _org_id
        AND COALESCE(invoice_date, created_at::date) BETWEEN _from AND _to
        AND status NOT IN ('draft', 'cancelled')
    ),
    'receipt_count', (
      SELECT COUNT(*)
      FROM public.receipts
      WHERE organization_id = _org_id
        AND COALESCE(payment_date, created_at::date) BETWEEN _from AND _to
    ),
    'aging', jsonb_build_object(
      'current', COALESCE((
        SELECT SUM(balance_due)
        FROM public.invoices
        WHERE organization_id = _org_id
          AND status NOT IN ('draft', 'cancelled', 'paid')
          AND balance_due > 0
          AND (due_date IS NULL OR due_date >= current_date)
      ), 0),
      '1_30', COALESCE((
        SELECT SUM(balance_due)
        FROM public.invoices
        WHERE organization_id = _org_id
          AND status NOT IN ('draft', 'cancelled', 'paid')
          AND balance_due > 0
          AND due_date < current_date
          AND due_date >= current_date - 30
      ), 0),
      '31_60', COALESCE((
        SELECT SUM(balance_due)
        FROM public.invoices
        WHERE organization_id = _org_id
          AND status NOT IN ('draft', 'cancelled', 'paid')
          AND balance_due > 0
          AND due_date < current_date - 30
          AND due_date >= current_date - 60
      ), 0),
      '61_90', COALESCE((
        SELECT SUM(balance_due)
        FROM public.invoices
        WHERE organization_id = _org_id
          AND status NOT IN ('draft', 'cancelled', 'paid')
          AND balance_due > 0
          AND due_date < current_date - 60
          AND due_date >= current_date - 90
      ), 0),
      '90_plus', COALESCE((
        SELECT SUM(balance_due)
        FROM public.invoices
        WHERE organization_id = _org_id
          AND status NOT IN ('draft', 'cancelled', 'paid')
          AND balance_due > 0
          AND due_date < current_date - 90
      ), 0)
    ),
    'monthly', COALESCE((
      SELECT jsonb_agg(month_row ORDER BY month_start)
      FROM (
        SELECT date_trunc('month', d)::date AS month_start,
          jsonb_build_object(
            'month', to_char(date_trunc('month', d), 'YYYY-MM'),
            'invoiced', COALESCE((
              SELECT SUM(total_amount)
              FROM public.invoices i
              WHERE i.organization_id = _org_id
                AND COALESCE(i.invoice_date, i.created_at::date) >= date_trunc('month', d)::date
                AND COALESCE(i.invoice_date, i.created_at::date) < (date_trunc('month', d) + interval '1 month')::date
                AND i.status NOT IN ('draft', 'cancelled')
            ), 0),
            'collected', COALESCE((
              SELECT SUM(amount_received)
              FROM public.receipts r
              WHERE r.organization_id = _org_id
                AND COALESCE(r.payment_date, r.created_at::date) >= date_trunc('month', d)::date
                AND COALESCE(r.payment_date, r.created_at::date) < (date_trunc('month', d) + interval '1 month')::date
            ), 0),
            'expenses', COALESCE((
              SELECT SUM(amount)
              FROM public.expenses e
              WHERE e.organization_id = _org_id
                AND e.date >= date_trunc('month', d)::date
                AND e.date < (date_trunc('month', d) + interval '1 month')::date
            ), 0),
            'worker_payments', COALESCE((
              SELECT SUM(amount)
              FROM public.worker_payments p
              WHERE p.organization_id = _org_id
                AND p.date >= date_trunc('month', d)::date
                AND p.date < (date_trunc('month', d) + interval '1 month')::date
            ), 0)
          ) AS month_row
        FROM generate_series(date_trunc('month', _from)::date, date_trunc('month', _to)::date, interval '1 month') d
      ) monthly_rows
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_period_report(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION public.get_finance_period_report(uuid, date, date)
IS 'Returns operational finance metrics while excluding draft and cancelled invoices from revenue, counts, ageing, and monthly invoicing.';

-- Keep the safety net aligned with the report semantics.
CREATE INDEX IF NOT EXISTS invoices_org_status_date_idx
  ON public.invoices (organization_id, status, invoice_date);

-- QA expectation: cancelled invoice records remain auditable but do not count as
-- invoiced revenue, receivables, ageing, or monthly invoicing.