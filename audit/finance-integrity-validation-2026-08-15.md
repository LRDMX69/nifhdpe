# Finance integrity validation — 15 August 2026

## Live findings

Production Finance showed the generated receipt `RECEIPTS/2026/0001` as **Unlinked** even though Bank Analysis showed the same UAT payment amount linked to `INVOICES/2026/0001`. The receipt has an `invoice_id`, so the direct bank link was authoritative at invoice level but was not reflected in the receipt register.

Production Finance, HR, and Document Registry displayed all three worker-payment records with a `Salary` type badge/label. Two records were described as staff-loan repayments (`₦20,000` and `₦10,000`). The persisted historical UAT rows retain `salary`, so the fix is presentation-safe rather than a destructive data rewrite.

## Fix

Finance now marks a generated receipt as `Linked via invoice` when its related invoice has an authoritative bank link, while retaining direct receipt links as `Linked`. Finance, HR, and Document Registry use a shared `workerPaymentTypeLabel` helper: explicit `loan_repayment` values display correctly, and legacy rows with a salary enum plus a loan/staff repayment description display truthfully as `loan repayment`. Finance’s Log Payment type selector now also exposes `loan_repayment` for future records.

## Local gates

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — existing 26-test suite |
| `pnpm build` | PASS — Vite production build completed in 5.84s |

## Production retest pending

After merge, verify Finance Receipts shows `Linked via invoice`, Finance Payments shows the two historical records as `Loan repayment`, HR’s connected payment register matches, and Document Registry’s worker-payment rows show the normalized labels.
