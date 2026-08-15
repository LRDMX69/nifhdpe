# Invoice and Waybill Completion Handoff

## Scope

This pull request is based on the latest merged `main` branch and completes the missing cross-module behavior that was not visible after the previous pull request was merged. It does not introduce a new operations page. It upgrades the existing Finance, Logistics, Quotations, and Document Registry modules.

## Implemented behavior

The Finance invoice workflow now captures client and source lineage, client purchase order, sales order, project, delivery, customer reference, site reference, delivery address/state/LGA/contact, invoice kind, currency, line units and specifications, line discounts, cost codes, VAT/tax, WHT, overhead, transportation, free-trade-zone state, payment terms, conditions, notes, and receiving account. The database RPC validates the organization, client, source records, line items, active finance account, and calculated totals before one atomic insert.

Invoice and sales-order numbering is now client-aware. The first document for a client receives the ordinary sequence reference. A later document in the same family for the same client reuses the first base reference with an alphabetic suffix, such as `INVOICES/2026/0027B`. Allocation is locked by organization, client, document family, and year.

Invoice payment now creates the receipt, updates amount paid and balance due, derives payment status, records audit history, and requires a receiving bank or cash account through the Finance payment path. The same receipt remains available for Bank Analysis reconciliation.

Waybill generation now follows a durable sequence: issue and persist the waybill record, assign its permanent number, link delivery/client/order/project references, render the PDF, then mark the stored record as `printed`. A rendering failure remains visible as `generation_failed` with its error. The Document Registry reads the stored waybill record and provides a reprint action that reuses the same number and payload, increments print count, changes status to `reprinted`, and records an audit event.

## Required migration order

Apply these migrations through Lovable Cloud/Supabase in timestamp order:

1. `supabase/migrations/20260815100000_hr_finance_workflow_connectors.sql`
2. `supabase/migrations/20260815130000_invoice_waybill_reactive_workflows.sql`

Then refresh the PostgREST schema cache, regenerate Supabase types through the Lovable Cloud workflow, and reload the application.

## Verification evidence

Local verification passed:

| Check | Result |
|---|---:|
| Standard TypeScript | Passed |
| Strict TypeScript | Passed |
| Vitest behavior/regression suite | Passed — 25 tests across 5 files |
| ESLint | Passed — 0 errors; existing warnings remain |
| Production build | Passed |
| High-severity dependency audit | Passed — 0 vulnerabilities |
| Diff hygiene | Passed |
| Production marker audit | Passed outside the documented benign allowlist |

The live database migration, regenerated production schema, RLS behavior, and authenticated end-to-end flows remain explicitly **NOT VERIFIED** from the sandbox. After migration, test at minimum: one client’s first and second invoices, quotation-to-order-to-invoice conversion, partial/full/overpayment-rejected receipt flow, delivery-to-waybill generation, Document Registry visibility, waybill reprint, generation-failure recovery, and cross-organization access denial.
