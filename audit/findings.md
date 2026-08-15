# Business-Flow Audit Findings

## Finding CF-001 — Proforma Invoice is an isolated creation record

**Evidence:** `src/pages/Quotations.tsx` contains one `createProforma` handler that allocates `next_doc_number`, reads quotation items, and directly inserts a row into `proforma_invoices`. The copied fields include client, quotation, issue/valid dates, currency, subtotal, discount, tax, transportation, total, JSON items, notes, and draft status. The UI exposes source quotation, valid-until, and notes, but it does not expose or persist all quotation commercial metadata such as payment terms, full terms/conditions, exclusions, assumptions, site/project/source attachment lineage, or client PO lineage.

**Transition gap:** The source scan found no proforma list/read query, no proforma acceptance/issue handler, no proforma-to-invoice conversion RPC, no invoice `proforma_invoice_id` relationship, and no proforma lifecycle audit/revision path. The current system therefore creates a document-shaped row but does not complete the business lifecycle `Quotation → Proforma → Accepted → Final Invoice`.

**Classification:** 🔴 Critical commercial lifecycle gap. The current direct insert is valid only as an initial draft creation step; it is not a complete proforma workflow.

## Finding CF-002 — Quotation-to-sales-order transition is stronger than proforma conversion but still partial

**Evidence:** `create_sales_order_from_quotation` locks the quotation, requires `q.status = 'accepted'`, rejects a non-cancelled duplicate order for the quotation, allocates an order number, copies client/opportunity/quotation IDs, subtotal/total/notes, copies quotation items, and records a business audit event. The UI exposes a sales-order creation action and order status/linked-invoice actions.

**Transition gap:** The source scan does not show the quotation’s full commercial fields, client PO, terms, transportation, discount, VAT/WHT, project/site, or attachments being propagated into the sales order contract. The UI directly changes quotation status and separately calls the sales-order RPC, leaving acceptance and conversion as two manually sequenced actions rather than one controlled acceptance/conversion workflow. This needs careful policy handling: acceptance must remain human-controlled, while safe copying and duplicate prevention can be automatic.

**Classification:** 🟡 Important propagation gap, with a possible 🔴 issue if downstream financial totals can diverge from the accepted quotation.

## Finding FIN-001 — Bank linking is a polymorphic reconciliation layer, not yet a full propagation layer

**Evidence:** `link_bank_transaction` validates organization ownership, supported entity type, approved/reviewed status, and entity existence, then upserts `finance_transaction_links` and marks the bank transaction `linked`. The allowlist includes invoice, receipt, expense, worker payment, purchase order, fuel log, director account, staff loan, loan repayment, salary schedule, overtime, VAT entry, external loan, and transfer.

**Transition gap:** The Finance UI’s `linkSources` only exposes invoices, receipts, expenses, and worker payments. Finance users cannot link purchase orders, fuel logs, director-account entries, HR loans, overtime, VAT entries, external loans, or transfers from the Finance module even though the database contract supports them. The RPC does not validate direction/account consistency, does not prevent total linked amounts from exceeding the bank line, and does not update the linked financial entity’s reconciliation state because those entities have no common reconciliation-status contract.

**Classification:** 🔴 Critical for the directive’s “bank analysis as central financial connection layer” requirement; 🟡 where the missing UI coverage is the only gap.

## Finding FIN-002 — Finance receivables and fallback charts are semantically unsafe

**Evidence:** `get_finance_period_report` returns period invoiced, period collected, operating expenses, worker payments, aging, and monthly values. Finance computes `receivables` as `totalRevenue - totalReceived`, even though the two values are period sums rather than the current invoice balance ledger. The fallback chart aggregates invoice `total_amount` by `created_at` and expense amount by date, while the authoritative report uses invoice date and period filters.

**Classification:** 🔴 Critical reporting correctness gap. Receivables should come from current invoice `balance_due`/aging, and fallback aggregation must use the same date/status/period semantics as the server report.

## Finding FIN-003 — Direct deletions can orphan polymorphic financial links

**Evidence:** Finance deletes `expenses` and `worker_payments` directly after a confirmation dialog. `finance_transaction_links` stores `entity_type`/`entity_id` polymorphically and therefore cannot use a normal foreign-key cascade for these links. No inspected deletion guard removes or invalidates links before the source record is deleted.

**Classification:** 🔴 Data-integrity gap. Financial records with bank-analysis links should be voided/reversed or deletion should be blocked; silent orphaned links must not be possible.

## Finding PROC-001 — GRN-to-inventory is implemented as a strong transition

**Evidence:** `receive_purchase_order_partial` locks the PO and line items, validates accepted plus rejected quantities against remaining quantity, creates or updates inventory, inserts a `stock_movements` receipt, inserts `grn_items`, updates received quantities, updates GRN status, updates PO to `partially_received` or `received`, and records an audit event. Procurement invalidates inventory queries after calling the RPC.

**Classification:** 🟢 Strong source-code evidence; live RLS/RPC behavior remains unverified.

## Finding PROC-002 — Supplier invoice/payment lineage is incomplete

**Evidence:** Purchase orders carry vendor invoice metadata, account, paid/outstanding fields, and bank account lineage. Finance vendor payments are still entered as generic `worker_payments` using a vendor name string. The UI checks whether any PO and any GRN exist for a vendor before allowing payment, but it does not persist a specific `purchase_order_id`, `goods_received_note_id`, supplier invoice ID, match result, or payment allocation.

**Classification:** 🔴 Critical P2P accounting lineage gap. The UI’s three-way-match gate is advisory/aggregate and can be bypassed by an override; the actual payment cannot be traced to a specific supplier invoice and receipt.

## Finding HR-001 — Leave and discipline approvals stop at decision fields

**Evidence:** HR review and MD-decision RPCs enforce role and review order, write decision metadata, and set leave request status. Disciplinary decisions write review/decision metadata. The inspected RPCs do not update a leave balance/employee leave ledger, create an outcome record, or add a business audit event in the same transition. Discipline decisions do not update an employee outcome/profile history or audit event in their function body.

**Classification:** 🔴 Critical lifecycle gap for the directive’s `Leave Request → HR Visibility → MD Approval → Decision → Employee Record → Leave Balance` and disciplinary audit requirements.

## Finding HR-002 — Staff-loan repayment uses a misleading payment type and lacks a dedicated repayment ledger link

**Evidence:** `record_staff_loan_repayment` inserts a `worker_payments` row with type `salary`, creates `hr_loan_repayments`, updates outstanding balance and loan status, and inherits the loan bank account. It does not use a dedicated `loan_repayment` worker-payment type or automatically create a bank-analysis link.

**Classification:** 🟡 Important financial classification and reconciliation gap; the balance transition itself is implemented atomically.

## Finding CLIENT-001 — Client 360 is a live multi-query view but not a unified financial/source-of-truth contract

**Evidence:** `ClientDetailDialog` separately queries quotations, invoices, sales orders, deliveries, receipts, projects, service tickets, and warranty assets by `client_id`. It calculates open/accepted quote values and invoice balance totals in the view. It does not query proforma invoices or waybills, and it does not expose a single client account ledger or unified document relationship graph.

**Classification:** 🟡 Important visibility gap. The records are live references, but the client history does not cover every client document stage or provide one authoritative account balance.


## Remediation status after autonomy hardening

The current working tree addresses the following findings in code and migration evidence:

| Finding | Remediation status | Evidence |
|---|---|---|
| CF-001 | Addressed in the new migration and Quotations UI | `create_proforma_invoice_from_quotation`, `decide_proforma_invoice`, client-aware numbering, idempotency, cancellation, audit/revision/source relationships, live list, acceptance-to-invoice controls. |
| FIN-001 | Addressed in UI and backend guardrails | Finance now loads all persisted bank-linkable entities; the replacement `link_bank_transaction` validates organization ownership, approval state, supported records, per-line amount, and aggregate linked amount. |
| FIN-002 | Addressed in Finance and shared math | Receivables use server aging when available; fallback uses current invoice balance and matching date/status semantics; worker payments are included in fallback and report chart expenses. |
| FIN-003 | Addressed in migration | Bank-linked financial records cannot be deleted through the guarded tables; void/reversal policy remains a management decision. |
| HR-001 | Partially addressed without inventing entitlement policy | Approved leave duration is stored deterministically, `hr_leave_usage_summary` exposes approved usage, and review/MD decisions write business-audit events. No entitlement balance is invented because no policy/table exists in the repository. |
| CLIENT-001 | Addressed for document visibility | Client 360 now includes proformas and waybills, exports them, and shows their live statuses and links. A unified customer subledger remains a separate future accounting decision. |

Remaining confirmed gaps requiring either additional management policy or live environment verification include supplier-invoice allocation/three-way-match posting, dedicated loan-repayment payment classification, source-account direction policy, RLS behavior after migration, and authenticated end-to-end RPC execution.
