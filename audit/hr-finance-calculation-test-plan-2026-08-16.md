# HR and Finance Calculation Gate — Live Test Notes — 2026-08-16

The live HR page exposes the connected `Finance & Benefits Workspace` through the `Open connected view` control. The implementation provides auditable rows for salary schedules, overtime, staff loans and repayments, VAT schedule entries, HMO, finance accounts, approval actions, payment creation, payslip generation, and bank-link sources.

The salary schedule path calculates net pay as gross salary minus pension, voluntary contribution, tax, other deductions, and loan repayment. Overtime calculates daily rate as monthly gross divided by the configured working-day basis, then multiplies by overtime days. Staff-loan monthly repayment is principal plus additional loan divided by the repayment period. VAT uses the shared `calculateVatSchedule` function and displays net amount, VAT payable, VAT credit, and total before the RPC persists the entry. Salary approval and payment are separate controlled reactions; a paid schedule exposes a Payslip action.

The live HR page currently has employee options `DMX`, `Oluwakemi Hassan`, and `Ola`. Existing UAT worker payments are present, but the connected finance workspace requires creating explicit schedule rows for the calculation gate. All new records will use clearly labelled UAT descriptions/notes and will be tested through the live UI.
