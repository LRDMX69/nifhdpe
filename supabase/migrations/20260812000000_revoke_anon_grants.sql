-- ============================================================================
-- REMOVE ANONYMOUS-ROLE ACCESS (C-05)
-- ============================================================================
-- Supabase grants ALL on newly created tables to anon, authenticated and
-- service_role by default. Row-level security currently prevents anonymous
-- reads, but the anon grant removes the second layer of defence: a single
-- over-permissive policy anywhere would become an unauthenticated leak.
--
-- The app has no anonymous surface that reads the public schema — every query
-- runs with the signed-in user's JWT (PostgREST role: authenticated) or the
-- service role from an edge function. Revoking from anon is therefore safe.
-- ============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Future tables/sequences/functions should not re-grant anon access either.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- The public auth helpers are used by storage policies and RPCs executed under
-- the user's JWT (authenticated role), so they remain available there.
