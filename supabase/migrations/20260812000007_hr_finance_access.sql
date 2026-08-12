-- ============================================================================
-- HR = Head of Finance (org structure decision — confirmed with the owner).
-- ============================================================================
-- `organization_memberships` is UNIQUE(organization_id, user_id): a person can
-- hold only ONE role per organization, so the Finance head cannot be given a
-- second `finance` membership. The current company structure makes the HR role
-- the head of the Finance department, therefore:
--
--   every RLS check for role 'finance' must ALSO pass for members holding 'hr'.
--
-- This is implemented at the single chokepoint every policy goes through
-- (public.has_org_role) so the mapping can never drift across the ~6 migration
-- files that write finance-gated policies. It is intentionally one-directional:
--   hr  →  finance access   (HR is head of Finance)
--   finance  →  hr access   (NOT granted — Accounts is not head of HR)
--
-- The frontend mirror lives in src/lib/constants.ts (FINANCE_CAPABLE_ROLES /
-- isFinanceCapable). Keep the two in sync when the org structure changes.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
  OR (
    _role = 'finance'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = _user_id AND organization_id = _org_id AND role = 'hr'::public.app_role
    )
  );
$$;

-- Grants are unchanged: the function keeps whatever EXECUTE privileges it had
-- (authenticated callers via RLS). Nothing is widened for anon.
