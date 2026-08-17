# Clean Production Data Sweep (Opportunities Preserved)

Wipe the test/UAT transactional data out of the ERP while keeping the system itself — schema, policies, functions, triggers, users, roles, configuration — completely untouched. Opportunities survive in full.

## What the database actually contains today

Only 50 tables hold any rows. The transactional footprint is small:

- Opportunities: 643 rows (preserve exactly)
- Audit trail: audit_logs 4,100; business_audit_events 50; document_revisions 24
- AI: ai_summaries 225
- Commercial: quotations 3 (+3 items), proforma 1, sales_orders 3 (+3 items), invoices 6 (+6 items), receipts 5, clients 1
- Procurement/Inventory: purchase_orders 2 (+2 items), GRN 1 (+1 item), vendors 1, inventory 1, stock_movements 2, reservations 1, procurement_demands 2, boqs 1 (+1 item), product_specifications 1, equipment 1
- Logistics: deliveries 1, delivery_items 1, waybills 2
- Finance: expenses 1, bank_statements 1, bank_transactions 2, finance_accounts 1, finance_transaction_links 2, vat_schedule_entries 2
- HR: worker_payments 6, hr_salary_schedules 2, hr_overtime_entries 1, hr_staff_loans 2, hr_loan_repayments 3, leave_requests 1
- Field: field_reports 2, field_report_photos 2
- Numbering: document_sequences 11 rows, client_document_sequences 3 rows
- People/config: profiles 2, organization_memberships 2, role_assignment_requests 2, system_maintenance_accounts 1

Storage: claims-proof 1 file, site-photos 6, claim-attachments 2, compliance-docs 1, avatars 0 — all buckets private.

## How the cleanup runs

One transactional cleanup migration, deleting child rows before parents so no foreign key or delete-protection trigger fires:

```text
items/links  -> invoice_items, quotation_items, sales_order_items,
                purchase_order_items, grn_items, delivery_items, boq_items,
                finance_transaction_links, field_report_photos,
                hr_loan_repayments, inventory_reservations, stock_movements
documents    -> receipts, waybills, deliveries, invoices, proforma_invoices,
                sales_orders, quotations, goods_received_notes, purchase_orders,
                procurement_demands, boqs, field_reports, document_revisions
finance/HR   -> bank_transactions, bank_statements, vat_schedule_entries,
                expenses, worker_payments, hr_salary_schedules,
                hr_overtime_entries, hr_staff_loans, leave_requests
masters      -> inventory, product_specifications, equipment, vendors, clients
derived      -> ai_summaries, business_audit_events, audit_logs
```

Notes on specific tables:

- `finance_accounts` (1 row) is treated as configuration, not a transaction — kept unless you say otherwise.
- `finance_transaction_links` is deleted first so the delete-protection trigger on bank-linked financial rows does not block invoice/expense deletion.
- `audit_logs` and `business_audit_events` are cleared because every row in them describes the test records being removed; keeping them would leave dangling references to deleted entities.
- `role_assignment_requests` (2), `profiles`, `organization_memberships`, `organizations`, `system_maintenance_accounts`, `auto_mode_settings`, `management_configuration`, `hr_workflow_settings`, `accounting_periods` are preserved — these are people and configuration.
- No auth users are touched.

## Numbering sequences

`document_sequences` rows are reset to `last_number = 0` for the 2026 year so the first real invoice, quotation, PO, waybill and receipt start at 0001 again. All 3 `client_document_sequences` rows belong to the single test client being deleted, so they are removed with it. Nothing that could produce a duplicate against a surviving document is reset, because no numbered documents survive.

## Storage

The 10 files across claims-proof, site-photos, claim-attachments and compliance-docs all belong to the field reports, claims and compliance records being deleted. They are removed after the row deletion, and each bucket is re-listed afterwards to confirm it is empty. Opportunity-related and system assets are not touched.

## Verification after the sweep

- Re-count every public table and show before/after.
- Confirm `opportunities` is still exactly 643 rows with a checksum over ids and statuses.
- Confirm profiles, memberships, roles, organizations and configuration counts are unchanged.
- Confirm no orphan rows: every remaining child row still resolves to its parent.
- Confirm policy, function, trigger, view and index counts are unchanged from a snapshot taken before the migration.
- Run typecheck and the Vitest suite.
- Drive Playwright through Dashboard, Finance, Invoices, Clients, Procurement, Inventory, HR/Payroll, Projects, Logistics, Document Registry and Opportunities on the empty state, capturing console errors and screenshots. Any page that crashes or shows a fabricated number on zero data is reported as a defect to fix in a follow-up, not patched over with sample data.

## What you get at the end

An evidence-based report: tables inspected, tables cleared with row counts, tables preserved and why, opportunity preservation proof, users/roles preserved, storage files removed, sequences reset, remaining records per module, anything deliberately left alone, and build/test/route results.

No fake data is created. No UI or UX work happens in this phase.
