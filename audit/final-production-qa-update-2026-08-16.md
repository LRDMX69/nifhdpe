# NIFHDPE ERP — Final Production QA Update

**Target:** [https://nifhdpe.vercel.app](https://nifhdpe.vercel.app)  
**Repository:** [LRDMX69/nifhdpe](https://github.com/LRDMX69/nifhdpe)  
**Commit:** `b44d45b` — `fix finance cancellation reporting and draft cleanup`  
**Execution date:** 16 August 2026

## Executive conclusion

The live ERP is **not yet eligible for a truthful production GO** because the deployed Finance report still includes a cancelled invoice in revenue and receivables. This is a reproducible accounting-integrity defect, not a cosmetic warning. The source-level correction and an operator-facing cancellation workflow have been implemented and pushed, but the migration has not yet been applied to the live Supabase database and the updated frontend has not yet been observed on the deployed site.

> A production readiness decision must follow observed live behavior, not source-code confidence. The current live behavior fails the cancellation-accounting invariant.

## Evidence from the live system

The production route [Finance → Invoices](https://nifhdpe.vercel.app/finance?tab=invoices) was opened with the authenticated maintenance-admin session. The incomplete New Invoice form correctly kept **Create invoice atomically** disabled when the client was missing and the subtotal was zero. After selecting the existing UAT client and entering `UAT validation line`, quantity `1`, and unit price `1000`, the form displayed subtotal `₦1,000.00`, VAT `₦75.00`, and gross/net due `₦1,075.00`, and the submit control became enabled.

A browser-index movement caused the valid-data verification click to submit instead of close the dialog. The resulting record was `INVOICES/2026/0001B`, amount `₦1,075.00`, against the explicitly marked UAT client. It had no payment, waybill, bank link, or document-registry record. After confirmation, the record was changed through the authenticated production session from `draft` to `cancelled`. A live refresh confirmed the cancelled status and confirmed that the legitimate `INVOICES/2026/0001` record remained `paid` and linked.

The cleanup exposed a production defect. After cancellation, the live Finance cards showed `Total Revenue ₦206,593.79` and `Receivables ₦1,075.00`, which included the cancelled record. The live invoice list showed the test invoice as `cancelled`, but the old deployment still exposed a **Record** payment action for it. This violates the expected invariant that cancelled invoices are audit-visible but excluded from operational totals and cannot receive payments.

## Corrective implementation

The commit contains three coordinated changes. First, `supabase/migrations/20260816090000_exclude_cancelled_invoices_from_finance_reports.sql` replaces the finance reporting function so that `draft` and `cancelled` invoices are excluded from invoiced revenue, invoice counts, ageing buckets, and monthly invoicing. Paid invoices remain excluded from receivables ageing, while cancelled records remain preserved for audit history.

Second, `src/pages/Finance.tsx` adds a supported **Cancel draft** action with an explicit confirmation. Cancellation is restricted to records still in `draft` status and keeps the record as `cancelled` rather than deleting it. Third, cancelled invoices no longer offer the payment-recording action, and the page refreshes invoice and finance-report data after cancellation.

TypeScript validation passed with `./node_modules/.bin/tsc --noEmit`, and `git diff --check` passed. The package-manager/Vite build could not execute in the sandbox because pnpm blocked dependency build scripts for `@swc/core`, `core-js`, and `esbuild`; this is an environment policy failure rather than a reported TypeScript failure.

## Required release gate

The migration must be applied to the live Supabase database, the frontend commit must be deployed by the Vercel project owner, and the Finance route must then be retested. The acceptance result is precise: the cancelled `INVOICES/2026/0001B` may remain visible with status `cancelled`, but `Total Revenue` must return to the pre-test legitimate amount, `Receivables` must return to `₦0.00`, the cancelled row must not expose **Record**, and the paid `INVOICES/2026/0001` must remain unchanged.

Until those observations are completed, the correct status is **NO-GO pending release-gate retest**, not a conditional production approval and not a confidence-based GO.

## Matrix updates

The authoritative matrix was updated at `audit/final-live-production-qa-matrix-2026-08-15.md` with the exact production URL, entered values, accidental record identifier, remediation, observed defect, commit, compilation evidence, and retest blocker.

