-- ============================================================================
-- RESTRICT VENDOR BANK DETAILS (H-06)
-- ============================================================================
-- The vendors SELECT policy legitimately lets any organization member view the
-- vendor row (warehouse staff need vendor names for GRNs). The problem is the
-- bank_details column riding along on every row read — account numbers for
-- every supplier visible to technicians and trainees is the classic
-- precondition for invoice-redirection fraud.
--
-- The app never renders bank_details, so we revoke the column grant from the
-- authenticated role. PostgREST then refuses any SELECT of that column for
-- every app user, while row-level RLS continues to scope vendor rows to the
-- organization. Privileged access remains available through the existing
-- SECURITY DEFINER helper get_vendor_bank_details and through the service role.
-- ============================================================================

REVOKE SELECT (bank_details) ON public.vendors FROM authenticated;
