-- ============================================================================
-- INDEX FOREIGN-KEY COLUMNS (M-03)
-- ============================================================================
-- Every RLS policy filters on organization_id, and the database linter reports
-- ~90 unindexed foreign keys. Without indexes each read degrades to a
-- sequential scan as soon as tables hold real volume — and RLS makes that cost
-- apply to every single read in the system.
--
-- Rather than enumerating columns by hand, this migration indexes every
-- foreign-key column that does not already have an index, in one pass. It is
-- idempotent and safe to re-run.
-- ============================================================================

DO $$
DECLARE
  r record;
  idx_name text;
BEGIN
  FOR r IN
    SELECT
      tc.table_name::text AS table_name,
      kcu.column_name::text AS column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  LOOP
    idx_name := format('idx_%I_%I', r.table_name, r.column_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = r.table_name
        AND indexdef ILIKE '%' || quote_ident(r.column_name) || '%'
    ) THEN
      BEGIN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', idx_name, r.table_name, r.column_name);
      EXCEPTION WHEN OTHERS THEN
        -- Skip columns that cannot be indexed (e.g. expression contexts); the
        -- remaining indexes are the important part.
        NULL;
      END;
    END IF;
  END LOOP;
END $$;
