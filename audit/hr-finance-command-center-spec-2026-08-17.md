# HR + Finance Command Center Specification

## Governing architecture

The centralized view belongs on the **normal HR role dashboard**. The maintenance Administrator may preview the HR role but must not contain or replace the HR dashboard. Detailed modules remain the source-of-truth surfaces for editing, approvals, investigation, reconciliation, and record management.

## Metric contract

| Area | Dashboard metric | Source of truth | Derivation | Drill-down |
|---|---|---|---|---|
| HR | Staff in organization | `organization_memberships` scoped by `organization_id` | Count visible memberships. The current schema has no employment-status column, so label must not claim terminated-account filtering unless the source later provides it. | `/hr?tab=idcards` |
| HR | Pending leave requests | `leave_requests` | `status = pending` | `/hr?tab=leaves` |
| HR | Staff currently on leave | `leave_requests` | `status = approved` and today lies between `start_date` and `end_date` | `/hr?tab=leaves` |
| HR | Open disciplinary matters | `disciplinary_records` | Records with no `action_taken`; the table has no separate status column | `/hr?tab=disciplinary` |
| HR | Pending HR actions | `leave_requests`, `disciplinary_records`, `hr_salary_schedules`, `hr_overtime_entries` | Sum of pending leaves, open disciplinary records, submitted payroll rows, and submitted overtime rows; the breakdown must be visible, not a mysterious total | `/hr` with contextual action links |
| HR | Payroll totals | `hr_salary_schedules`, `worker_payments` | Current-period submitted/approved/paid salary gross and net, plus paid salary payments; reuse stored schedule/payment values | `/hr?tab=payroll` |
| HR | Overtime totals | `hr_overtime_entries`, `worker_payments` | Current-period overtime earnings and paid overtime payments | `/hr?tab=payroll` |
| HR | Staff loans outstanding | `hr_staff_loans` | Sum of positive `outstanding_balance` for active loans | `/hr?tab=payroll` or the loan workspace |
| HR | HMO coverage | `hr_hmo_enrolments` | Active/current enrolment count and current coverage cost; no invented member-status fields | `/hr?tab=benefits` |
| Finance | Current bank position | `bank_statements`, `finance_accounts` | Latest `closing_balance` per active account with a statement, summed by currency; clearly label as latest statement position, not an unverified real-time balance | `/finance?tab=bank-analysis` |
| Finance | Total income | `get_finance_period_report` plus Finance page cancellation adjustment | Reuse the canonical Finance aggregation for the selected/default 12-month period | `/finance` |
| Finance | Total expenses | `get_finance_period_report` and Finance page aggregation | Operating expenses plus worker payments as Finance already defines them | `/finance?tab=expenses` or `/finance?tab=payments` |
| Finance | Receivables | Finance page aging calculation | Reuse aging buckets and cancelled-invoice adjustment | `/finance?tab=invoices` |
| Finance | Unpaid/part-paid invoices | `invoices` | Non-draft, non-cancelled/void invoices with positive `balance_due` | `/finance?tab=invoices` |
| Finance | Total invoice value | `invoices` | Sum of operational, non-draft, non-cancelled/void `total_amount` for the report period | `/finance?tab=invoices` |
| Finance | Supplier obligations | `purchase_orders` | Open POs (`status` not `closed`, `cancelled`, or `received`) summed by outstanding amount where metadata exposes amount paid; otherwise use committed PO value and label it as commitment | `/procurement` |
| Finance | Petty cash | `finance_accounts`, `bank_statements` | Latest statement closing balances for active accounts whose `account_type = cash`; if none has a statement, show zero with a source-aware empty explanation rather than inventing a balance | `/finance?tab=bank-analysis` |
| Finance | External loans | `hr_external_loans` | Sum of positive `remaining_balance` for non-closed/non-paid loans | `/hr?tab=payroll` or Finance bank analysis link area |
| Finance | VAT payable | `vat_schedule_entries` | Sum stored `total_vat_credit_payable`; separately show output/input VAT and withholding tax from stored fields | `/hr?tab=payroll` (VAT Schedule) |
| Finance | Procurement expenditure | `purchase_orders` and `expenses` | Actual received/paid procurement amounts and expense rows, not quotation value; label commitments separately from paid expenditure | `/procurement` |
| Finance | Site / administrative / import / forex | `expenses.expense_scope`, PO metadata (`procurement_mode`, `exchange_rate`, `site_reference`) | Show only dimensions present in the canonical records. Import/forex must use stored PO metadata; do not imply complete coverage if rows are missing those fields | `/procurement` or `/finance?tab=expenses` |
| Finance | Bank review exceptions | `bank_transactions`, `finance_reconciliations` | Pending/suggested bank lines plus open/exception reconciliations | `/finance?tab=bank-analysis` |

## Synchronization requirements

The dashboard must query the source records directly with organization scoping and stable TanStack Query keys. Successful writes in Finance and HR must invalidate or refresh the dashboard keys. Metrics must show loading and error states, and each actionable metric must link to the owning module. No metric may be manually duplicated, hardcoded, or calculated from a second independent ledger.

## Permission requirements

The dashboard must render the command center only for `activeRole === "hr"`, Administrator, or the maintenance preview where the HR dashboard itself is being inspected. It must not expose HR-Finance records to roles that cannot legitimately view those modules. The maintenance Administrator’s own dashboard must remain separate from this HR command center.
