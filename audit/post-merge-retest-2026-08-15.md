# Post-merge live retest evidence — 2026-08-15

PR #10 is merged into `main` at merge commit `b14a45f477f0124b6e81d0becbc52d5905b6d018`. Public production returned HTTP 200 and loaded the authenticated ERP.

## Pipe Calculator

On `https://nifhdpe.vercel.app/calculator`, zero length and zero flow were submitted. The merged production build displayed the inline validation message: `Length and flow rate must both be greater than zero.` No zero-result cards were shown. This is a live PASS for the repaired validation defect.

A valid controlled calculation of 200m and 10 L/s returned 16 bar, 1.57 m/s, 4.87 m head loss, and 628 kg. This is a live PASS for preserving valid calculations.

Remaining repaired workflows still require live execution: direct PO-card Receive GRN/list refresh, Finance immediate aggregate refresh, Document Registry revisions, payroll breakdown/type, and proforma-authoritative invoice totals.

## Document Registry

The merged production deployment now shows `8 revisions` with revision rows, including current and superseded snapshots, and no `Some document sources could not be loaded` warning. The registry shows 9 numbered documents, including waybill reprint state. This is a live PASS for the missing revisions source repair. Historical UAT worker payment 2 still displays `salary`, as expected because it was created before the corrective migration; a fresh loan repayment is required to verify the new type.

## Procurement and GRN

A fresh UAT PO `PURCHASE_ORDERS/2026/0002` was created in production with one 2m line at ₦15,000. The PO card exposed `Receive GRN`; invoking it opened the `Receive Goods via PO` dialog with `PURCHASE_ORDERS/2026/0002` selected. The old no-context failure did not occur. The dialog reported no outstanding line items for this draft PO, so no receipt was posted. Existing `GOODS_RECEIVED_NOTES/2026/0001` rendered in the Goods Received register with 8 received. **Live PASS for direct-action wiring and GRN list rendering; receipt posting on the newly created draft PO was blocked by its no-outstanding-line state.**

## Finance aggregate

The merged production Finance overview loaded with `0 unpaid invoices · 2 recent payments tracked`, Total Revenue ₦205,518.79, Total Received ₦205,518.79, Receivables ₦0.00, and Net Cash Position ₦-54,481.21. This confirms the deployed aggregate query now reflects the existing paid UAT invoice after page load. A same-session post-mutation payment could not be created safely against the already-paid invoice, so the exact immediate mutation invalidation path remains a partial live PASS rather than a full regression PASS.

## Evidence checkpoint

The merged public deployment is confirmed live for the Calculator, Document Registry, Procurement, and Finance routes. The remaining investigation focuses on HR attendance, fresh payroll/loan RPC records, and exact proforma conversion integrity.

## HR attendance

On merged production, Check In was invoked and allowed to settle. The UI remained `Not checked in`, with Checked In 0, Completed 0, Total Today 0, and `No check-ins for this date yet`. **Live FAIL persists: attendance Check In remains a silent no-op and was not fixed by PR #10.**

## Fresh loan repayment and payroll propagation

On merged production, a controlled second repayment of ₦10,000 was recorded for Ola with note `UAT post-merge loan repayment type verification`. The loan balance changed from ₦40,000 to ₦30,000 and the UI showed `Loan repayment recorded`. HR Payroll then showed 2 payments totaling ₦259,000: the existing ₦239,000 salary payment and the historical ₦20,000 staff-loan repayment. The new ₦10,000 repayment did not appear in the Payroll register during this immediate settled view, so the balance mutation passed but worker-payment propagation/type verification is **not yet a full pass** and requires refresh/database inspection.
