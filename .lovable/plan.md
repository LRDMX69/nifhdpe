# Apply the two pending Aug 16 migrations

## What I verified in the live database

Two migration files in the repo are not applied yet, and I confirmed both gaps directly against the live database:

- `messages` has only SELECT, INSERT and UPDATE policies — there is **no DELETE policy**, so deleting a message affects zero rows and the message stays visible after refresh.
- `get_finance_period_report` still counts **cancelled invoices**: its current definition contains no `cancelled` exclusion, so Revenue, invoice counts, receivables and ageing are inflated.
- The supporting index `invoices_org_status_date_idx` does not exist yet.

All older migration files are already applied.

## What I will do

1. Apply `20260816090000_exclude_cancelled_invoices_from_finance_reports.sql` byte-for-byte: redefine the finance period report to exclude draft and cancelled invoices from invoiced totals, counts, ageing buckets and the monthly series, and add the `(organization_id, status, invoice_date)` index.
2. Apply `20260816093000_messages_delete_policy.sql` byte-for-byte: sender-scoped DELETE on direct/context messages, plus administrator and maintenance-admin moderation.
3. Re-query the database afterwards to confirm the DELETE policy exists and the function body carries the cancelled exclusion.
4. Run the database linter and report anything it flags.
5. Sweep for issues introduced by the latest local changes: TypeScript check, lint, test suite, and the Finance/Messages code paths that consume these two changes, then fix whatever those checks surface.

## Technical notes

- No table is created, so no new GRANTs are needed; `get_finance_period_report` keeps `SECURITY INVOKER` with its in-function membership check and existing execute grant.
- Cancelled invoices remain fully readable for audit history — only the operational report totals change.
- Expected result on the current dataset: Revenue drops to the paid-invoice total and Receivables goes to zero for the cancelled QA invoice.
