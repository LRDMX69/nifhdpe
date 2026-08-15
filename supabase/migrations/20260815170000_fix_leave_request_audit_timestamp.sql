-- Fix the legacy leave_requests table so the shared updated_at trigger can safely
-- run during HR review/decision updates. The original table only had created_at,
-- while production trigger history assumes updated_at exists.
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.leave_requests
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.leave_requests
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_leave_requests_updated_at
  ON public.leave_requests(organization_id, updated_at DESC);
