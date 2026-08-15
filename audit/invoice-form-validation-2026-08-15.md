# Invoice form validation — 15 August 2026

## Live finding

The production New Invoice dialog exposed complete required and connected fields, but its initial `Create invoice atomically` button was enabled with no client, no description, and a zero subtotal. The mutation itself already rejected these conditions with explicit messages, but the enabled control was poor first-use UX and allowed an avoidable invalid-submit attempt.

## Fix

`InvoiceDialog` now computes `canSubmit` from client selection, non-empty descriptions, positive quantities, non-negative prices, and a positive subtotal. The button is disabled until those conditions are met; the existing mutation guards remain in place as defense in depth.

## Local gates

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — existing 26-test suite |
| `pnpm build` | PASS — Vite production build completed in 5.84s |

Production retest of the merged correction is pending.
