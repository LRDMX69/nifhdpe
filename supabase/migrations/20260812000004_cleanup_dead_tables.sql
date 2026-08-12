-- ============================================================================
-- CLEANUP DEAD SCHEMA (M-10)
-- ============================================================================
-- _mig_test is a migration scratch table: one column, no RLS policies, no
-- application code references. It is the only table in the schema with no
-- policies, so it keeps appearing in every security scan and misleads readers
-- about the system. It is dropped here.
--
-- print_requests and knowledge_articles back features that were removed from
-- the UI. Dropping them is a product decision (they may hold real data), so
-- they are intentionally LEFT IN PLACE pending the HR/product session.
-- ============================================================================

DROP TABLE IF EXISTS public._mig_test;
