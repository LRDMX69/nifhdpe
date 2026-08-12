-- ============================================================================
-- FINANCE AUDIT & REVISION HISTORY
-- ============================================================================
-- Two objective gaps closed:
--
-- 1. The money tables (invoices, invoice_items, receipts) had NO audit
--    triggers while inventory/projects/claims/etc. were fully audited.
--    Every change to a financial document is now captured in audit_logs with
--    old_data/new_data so the original values and authors are never lost.
--
-- 2. Revision reasons: invoices/quotations gain a transient `revision_reason`
--    column. The app sends the reason in the same UPDATE payload; a BEFORE
--    trigger stashes it into the transaction-local GUC and nulls the column so
--    it never persists on the live row; the AFTER audit trigger copies it into
--    audit_logs.revision_reason. Works through plain PostgREST PATCH because
--    the BEFORE and AFTER triggers share the request's transaction.
--
-- Viewing: audit_logs SELECT is widened from "admin only" to finance-capable
-- roles (HR is head of Finance — see 20260812000007_hr_finance_access.sql).
-- ============================================================================

-- 1) revision_reason storage on the audit trail
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS revision_reason TEXT;

-- 2) transient reason column on the two money documents the app revises
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS revision_reason TEXT;
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS revision_reason TEXT;

-- 3) BEFORE UPDATE: stash reason into the transaction GUC, keep the live row clean
CREATE OR REPLACE FUNCTION public.stash_revision_reason()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.revision_reason', COALESCE(NEW.revision_reason, ''), true);
  NEW.revision_reason := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stash_revision_reason ON public.invoices;
CREATE TRIGGER trg_stash_revision_reason
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.stash_revision_reason();

DROP TRIGGER IF EXISTS trg_stash_revision_reason ON public.quotations;
CREATE TRIGGER trg_stash_revision_reason
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.stash_revision_reason();

-- 4) extend the canonical audit function to carry the reason
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_reason TEXT := COALESCE(NULLIF(current_setting('app.revision_reason', true), ''), NULL);
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      COALESCE(OLD.organization_id, NEW.organization_id),
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data, revision_reason)
    VALUES (
      COALESCE(OLD.organization_id, NEW.organization_id),
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW),
      v_reason
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      NEW.organization_id,
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 5) audit triggers for the money tables (were completely unaudited)
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_invoice_items ON public.invoice_items;
CREATE TRIGGER trg_audit_invoice_items
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_receipts ON public.receipts;
CREATE TRIGGER trg_audit_receipts
  AFTER INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 6) finance-capable roles may view the audit trail (admin already could)
DROP POLICY IF EXISTS "Finance-capable can view audit logs" ON public.audit_logs;
CREATE POLICY "Finance-capable can view audit logs" ON public.audit_logs
  FOR SELECT
  USING (
    is_org_admin(auth.uid(), organization_id)
    OR has_org_role(auth.uid(), organization_id, 'finance'::public.app_role)
  );

-- Insert policy unchanged: the audit triggers run as SECURITY DEFINER (owner)
-- and bypass RLS; members who write audited tables never need INSERT on
-- audit_logs directly.
