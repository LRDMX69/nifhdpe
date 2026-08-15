# Wide Business-Flow Autonomy Hardening — Pull-Request Handoff

## Review location

The earlier invoice/waybill pull request has been merged. This follow-up commit is on `feat/invoice-waybill-reactive-workflows` and must be reviewed in the fresh pull request created from the now-current `main`.

**Latest commit:** `bfbd509`  
**Hosted CI:** [NIFHDPE CI run 31888184925](https://github.com/LRDMX69/nifhdpe/actions/runs/31888184925) — passed.

## Included work

This change is the repository-wide wide-research hardening pass. It completes the quotation-to-proforma-to-invoice lifecycle, adds live proforma and waybill visibility to Client 360 and Document Registry, expands Finance Bank Analysis to every persisted entity supported by the backend, corrects aging/reporting semantics, blocks deletion of bank-linked records, records deterministic leave usage and HR/MD audit events, and removes silent Supabase Edge Function failures from automation callers.

It also adds the shared `scripts/audit-production-markers.sh` used by both local verification and `.github/workflows/ci.yml`, the deterministic aging-receivable test, and the full `docs/business-flow-autonomy-audit.md` report with external ERP/HDPE references and live-verification limits.

## Migration order

Apply in order after merge:

1. `20260815100000_hr_finance_workflow_connectors.sql`
2. `20260815130000_invoice_waybill_reactive_workflows.sql`
3. `20260815150000_business_flow_autonomy_hardening.sql`

Refresh the PostgREST schema cache, regenerate Supabase types through Lovable Cloud, and execute the authenticated smoke-test matrix in the audit report.

## Verification boundary

Local and hosted repository checks pass. Live Supabase execution, RLS/grants, overloaded RPC resolution, real data joins, and role-specific end-to-end behavior remain **NOT VERIFIED** until the migrations are applied and exercised in Lovable Cloud.
