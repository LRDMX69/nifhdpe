# Apply the three new Aug 15 migrations and close the access gaps

## What I checked

Your local changes add three migration files that are not in the database yet. I queried the live database: none of the new tables exist (`finance_accounts`, `document_attachments`, `client_purchase_orders`, `proforma_invoices`, `bank_statements`, `bank_transactions`, `finance_reconciliations`, HR salary/overtime/loan/HMO tables, `vat_schedule_entries`, `waybills`, `client_document_sequences`).

App code already calls into this layer, so those screens fail today: Finance, Quotations, Document Registry, Client detail, Invoice dialog, the two HR finance workspaces, and waybill generation.

## Issue found in the migration files

The HR/finance file grants table access to signed-in users for its new tables, but the invoice/waybill file creates `waybills` and `client_document_sequences` with row-level security and **no table grants at all**. Without them every read and write on waybills returns a permission error even after the tables exist. No new table grants access to the service role either, so background jobs and edge functions touching them would fail.

## What I will do

1. Apply the three migrations in date order, exactly as written:
   - HR and finance workflow connectors (accounts, client POs, proforma, bank statements/transactions, salary schedules, overtime, staff and external loans, HMO, VAT schedule, leave/discipline review and decision flow)
   - Invoice and waybill reactive workflows (client-aware document numbering, invoice normalization, durable waybills, print lifecycle, payment recording)
   - Business-flow autonomy hardening (proforma lifecycle, delete guards on linked financial records, bank transaction linking, leave usage summary)
2. Add the missing grants in the same run: read/write for signed-in users on `waybills` and `client_document_sequences`, plus full access for the service role on every table these three migrations create. No anonymous access — all policies are membership scoped.
3. Regenerate the database type definitions so the new tables, columns, and functions are typed in the app.
4. Run the database linter and report anything it flags.
5. Load the affected pages in a browser (Finance, Quotations, Document Registry, HR workspaces, Logistics) and confirm no runtime errors.

## Technical notes

- No policy or business rule from your files is changed — only the missing grants are added.
- The migrations are order dependent: the second and third files extend tables and functions created by the first.
- `record_invoice_payment` and `next_client_document_number` are redefined by these files; the newer overloads replace or sit alongside the existing ones, so current callers keep working.
