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
