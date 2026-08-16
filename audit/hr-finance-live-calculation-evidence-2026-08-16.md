# HR Finance Live Calculation Evidence — 2026-08-16

## Payroll statutory preview

On the latest deployed HR Finance & Benefits workspace, the salary schedule dialog accepted employee `DMX` and gross salary `₦240,000`. The live calculation panel displayed employee pension `₦19,200.00`, NHF `₦3,000.00`, PAYE `₦22,824.67`, employer pension `₦24,000.00`, and net payable `₦194,975.33`. This confirms that the shared Nigerian payroll calculator is connected to the salary schedule form. A further deployment includes an explicit schedule-note field for the final UAT record; no salary row was saved during this preview.

## VAT schedule

The live VAT form accepted the labeled client `UAT VAT QA Client — 2026-08-16` with gross amount `₦100,000`, output VAT `₦7,500`, input VAT `₦2,500`, VAT withheld `₦500`, VAT paid `₦3,000`, penalty `₦100`, interest `₦50`, and brought forward `₦250`. The preview displayed net amount `₦99,500.00`, VAT payable `₦1,400.00`, VAT credit `₦0.00`, and total `₦1,400.00`. Selecting Save produced `VAT schedule entry saved`, and the list immediately showed the UAT client with `₦1,400.00`.

## Remaining HR calculation steps

The salary row still needs to be created with the explicit UAT note, approved, paid, and used to generate a payslip after the NHF migration is applied. Overtime and staff-loan creation, repayment schedule verification, and bank reconciliation propagation remain to be tested.

## Overtime

The live overtime form accepted employee `DMX`, monthly gross `₦240,000`, working-day basis `20`, and overtime days `2`. It displayed calculated overtime of `₦24,000.00`, matching the deterministic daily-rate formula. The form is now deployed with a schedule-note field for the final labeled UAT record; no overtime row was saved during this preview.

## Staff loan and repayment

The live staff-loan form accepted employee `DMX`, amount `₦60,000`, additional loan `₦5,000`, and repayment period `5` months. It displayed monthly repayment `₦13,000.00`. Saving with note `UAT staff loan repayment schedule QA — 2026-08-16` produced `Staff loan recorded` and immediately listed the new active loan with balance `₦65,000.00` and `5 months`. Recording a `₦13,000` repayment with note `UAT loan repayment reaction QA — first scheduled installment` produced `Loan repayment recorded` and reduced the live outstanding balance to `₦52,000.00`, confirming the downstream repayment reaction.

## Bank and reconciliation oversight

The connected Bank & Reconciliation Oversight surface currently shows `1` statement, `1` bank line, `0` pending review, and director balance `₦0.00`. The visible line is `UAT payment for INVOICES/2026/0001`, marked `linked`, for `+₦205,518.79`. Reconciliation controls are present, but this session did not create a fresh bank statement or reconciliation because there is already a linked UAT line and no pending review item available for a new action. Fresh bank reconciliation propagation remains a separate retest requirement unless an approved/suggested test line is imported.

## Final migrated payroll lifecycle — PASS

After the user confirmed the NHF salary migration was live, a controlled row was submitted for employee DMX with gross salary `₦240,000.00` and note `UAT payroll migration retest — NHF statutory + payslip QA — 2026-08-16`. The live preview displayed employee pension `₦19,200.00`, NHF `₦3,000.00`, PAYE `₦22,824.67`, employer pension `₦24,000.00`, and net payable `₦194,975.33`.

The row moved through `submitted` → `approved` → `paid`. The paid-row action generated `employee-payslip-PAY-10d0843b-2026-08-01 (3).pdf`. `pdfinfo` verified one A5 page (`419.53 × 595.28 pt`); `pdftotext` verified employee DMX, period `2026-08-01 to 2026-08-16`, gross salary `NGN 240,000.00`, employee pension `NGN 19,200.00`, NHF `NGN 3,000.00`, PAYE/tax `NGN 22,824.67`, HR Approved badge, net payable `NGN 194,975.33`, and Page 1 of 1. The compact payslip layout fix is therefore live and passes for this UAT record.

## Final overtime lifecycle — PASS

A controlled DMX overtime row was submitted with monthly gross `₦240,000.00`, working-day basis `20`, overtime days `2`, and note `UAT overtime migration retest — deterministic rate + payment QA — 2026-08-16`. The live preview calculated overtime earnings of `₦24,000.00` (`₦240,000 ÷ 20 × 2`). The row moved through `submitted` → `approved` → `paid`; the final live card displayed `DMX · Overtime · 2026-08-01 · paid · ₦24,000.00`, with notifications confirming `Overtime submitted`, `Overtime approved`, and `Overtime payment created`. Overtime calculation and approval-to-worker-payment reaction: **PASS**.

## Finance propagation retest — PASS with bank-link limitation

The live Finance module’s Payments tab immediately listed both new downstream worker payments: DMX salary `₦194,975.33` with description `Salary schedule 2026-08-01 to 2026-08-16`, and DMX overtime `₦24,000.00` with description `Overtime 2026-08-01`. The previously recorded DMX loan repayment `₦13,000.00` was also present. HR-to-Finance worker-payment propagation: **PASS**.

The connected Bank & Reconciliation Oversight surface remains internally consistent at `1` statement, `1` bank line, `0` pending review, and director balance `₦0.00`; the visible existing line is `UAT payment for INVOICES/2026/0001`, linked for `+₦205,518.79`. The new DMX worker payments are currently marked `Unlinked` in Finance, which is expected until a bank statement line is imported and manually matched. A fresh bank-line import/reconciliation action was not performed because no pending statement line was available in the live dataset. Bank reconciliation propagation remains **BLOCKED/PENDING fresh test data**, not marked PASS.

## Final bank reconciliation retest — PASS

A fresh labeled UAT line was created in statement `UAT Statement 2026-08-15 - Receipt linkage` with transaction date `2026-08-16`, description `UAT worker payment — DMX salary — migration QA`, reference `UAT-DMX-SALARY-2026-08-16`, direction `Debit`, and amount `₦194,975.33`. The application confirmed `Bank line queued for review`, then the line was approved and displayed as `approved` with outgoing value `-₦194,975.33`.

The approved line was linked through the ERP-record workflow as `worker payment` to the verified DMX salary worker-payment UUID `e5a6c41c-8945-44d2-b3e5-a6f1bdc03c9d`, with linked amount `₦194,975.33` and the audit note `UAT reconciliation QA: approved debit linked to DMX salary worker payment dated 2026-08-16; no duplicate transaction created.` The application confirmed `Bank line linked — The ERP record and bank analysis now share an auditable link.`

Post-link state showed `1` statement, `2` bank lines, `0` pending review, and director balance `₦0.00`. Both visible lines were marked `linked`: the new DMX salary debit `-₦194,975.33` and the existing invoice receipt credit `+₦205,518.79`. The link workflow explicitly states that it does not create a duplicate transaction. Bank reconciliation, HR-to-Finance-to-Bank propagation, exact amount matching, human review, and auditable ERP linkage: **PASS**.

This fresh retest supersedes the earlier pending limitation recorded in the prior section; the earlier note is retained as historical evidence of the pre-retest state.

## Gate 6 conclusion — PASS

Salary statutory calculations, payslip generation and one-page A5 layout, overtime calculation and payment reaction, Finance worker-payment propagation, VAT schedule persistence, staff-loan repayment reaction, and bank reconciliation linkage all passed against the labeled UAT records above. Gate 6 is therefore **PASS**.
