# Invoice revision-history validation — 15 August 2026

## Reproduction

On the deployed Finance Invoices page, `INVOICES/2026/0001` exposed a Revision History action. The dialog reported `No changes recorded for this record yet`, while the settled Document Registry showed four invoice snapshots (v1–v4) for the same organization and invoice lifecycle. This was a cross-module history inconsistency.

## Root cause

`AuditHistoryDialog` queried only `audit_logs`. Operational invoice edits are captured by the `document_revisions` table and corresponding `business_audit_events`, so a record can have immutable operational snapshots while the dialog’s audit_logs-only query returns an empty list.

## Fix

The dialog now prefers detailed `audit_logs` entries and falls back to `document_revisions` for operational entities (`invoices`, `purchase_orders`, `deliveries`, `projects`, and `field_reports`). The fallback reconstructs adjacent snapshot comparisons, revision numbers, current/superseded state, change reason, and timestamp in the same UI.

## Local gates

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 5 files, 26 tests |
| `pnpm build` | PASS — Vite production build completed in 5.74s |

## Production retest pending

After merge and deployment, reopen the invoice’s Revision History dialog and verify that the invoice snapshots appear with revision metadata and changed values instead of the empty state.
