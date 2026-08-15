# NIFHDPE HR Requirements Integration Plan

## Goal

Upgrade the existing NIFHDPE ERP using the HR meeting requirements in `pasted_content_2.txt`, while preserving the current architecture and avoiding disconnected feature pages. The implementation will make HR a controlled operational and finance oversight surface, expose relevant Quotations and Logistics information to HR, and connect every new workflow to the existing client, quotation, sales-order, invoice, payment, procurement, inventory, payroll, document, audit, and reporting foundations.

The plan explicitly treats the requirements as end-to-end business workflows rather than isolated forms. Each workflow must have a real data model, organization ownership, RLS, role gates, validation, calculations, downstream updates, auditability, user feedback, and a tested UI path.

## Current architectural findings

The current application already uses a React/Vite/Supabase architecture with TanStack Query, organization-scoped Supabase access, industrial RPCs, a schema-flexible `industrialDb` adapter for recently migrated tables, shadcn/ui components, and a shared NIF PDF/document layer. The existing native HR page is the correct primary insertion point: it already owns Attendance, Leaves, Payroll, ID Cards, Performance, Recruitment, Training, Skills, Disciplinary, and Promotions. It should be extended with cohesive HR tabs and oversight cards rather than replaced or split into new pages.

The current role architecture already treats HR as finance-capable. The database migration `20260812000007_hr_finance_access.sql` maps `hr` to finance access through the central `has_org_role` function, and the frontend mirrors that through `FINANCE_CAPABLE_ROLES` and `isFinanceCapable`. This must remain a single source of truth; HR must not be granted unrestricted administrator privileges.

The current Clients page is the central client master and Client 360 already aggregates quotations, invoices, sales orders, deliveries, receipts, projects, service tickets, and warranty assets. The main gap is that HR cannot currently create clients and the client entity lacks several requested commercial fields such as TIN, PO metadata, and attachment lineage. The solution is to widen the existing client capability for HR and enrich the central record, not to create a second HR client database.

Quotations already supports itemized and lump-sum quotations, client and opportunity linkage, product specifications, discount, overhead, tax, transport, payment terms, assumptions, exclusions, revision snapshots, and conversion into a sales-order lifecycle. The current flow is suitable for HR visibility, but attachments, RQ/ROQ/pricing evidence, explicit VAT/WHT policy fields, invoice/proforma lineage, and some document presentation features require completion.

Logistics already owns deliveries, sales-order dispatch queues, vehicles, fuel logs, GPS completion, waybill generation, delivery items, lot traceability, and manual-dispatch exception reasons. HR should receive a read-oriented operational summary and relevant transport-cost visibility through this existing module. It must not receive a duplicated fleet or delivery data model in HR.

Finance currently owns overview, invoices, receipts, expenses, and payments. Its expense model is still a generic category/date/description/amount record and does not yet provide the requested financial account, folio, site-versus-administrative classification, director-account, bank-statement, reconciliation, loan, VAT, payee, or schedule architecture. These are finance-owned records that may be initiated or reviewed from HR where appropriate, but they must remain connected to Finance and reporting rather than becoming HR-only shadow records.

## Requirement classification before implementation

| Requirement area | Current status | Evidence and planned treatment |
|---|---|---|
| Attendance, basic leave requests, recruitment, training, skills, performance, disciplinary records, promotions, ID cards | Already implemented but incomplete | Existing HR tabs and organization-scoped queries exist. Approval authority, audit detail, validation, and some role-specific workflows need hardening. |
| HR visibility of Finance | Partially implemented | HR inherits finance access in both RLS and frontend constants, but HR needs a purposeful Finance oversight surface rather than only a broad Finance link. |
| HR client creation | Missing permission / partially implemented entity | Clients is the central master, but HR is excluded from its edit gate. Widen the existing gate and add requested central fields and attachment lineage. |
| Quotations and sales-order visibility for HR | Missing contextual surface | Quotations and sales orders are connected, but HR has no native summary or filtered view. Add an HR commercial oversight section using the existing tables and links. |
| Logistics visibility for HR | Missing contextual surface | Logistics is connected and operationally owned by Logistics/Warehouse. Add HR transport/delivery summary and deep links without duplicating delivery records. |
| Quotation attachments, RQ/ROQ/pricing evidence, VAT/discount/transport details | Partially implemented | Commercial calculations and several fields exist. Add attachment metadata/storage references, configurable tax fields, and PDF inclusion where policy is explicitly configured. |
| Invoice from accepted/confirmed commercial flow | Partially implemented | Sales-order-to-invoice RPC and automatic numbering exist. Complete invoice presentation, PO linkage, bank details, WHT/transport fields, PDF output, and client balance propagation. |
| Proforma invoice | Missing | Add a proforma document path with a separate numbering sequence/type and no consumption of official invoice numbers. Keep ownership in Finance/Quotations, with HR visibility where relevant. |
| Finalized invoice revision history | Partially implemented foundation | Document revisions exist for quotations and a registry exists. Extend the same auditable revision model to invoices with original snapshot, active version, editor, timestamp, reason, and immutable history. |
| Waybill from invoice | Partially implemented | A non-financial waybill generator exists. Add invoice/sales-order linkage and editable delivery details without copying VAT, cost, or financial totals. |
| Expense classification and folio/money source | Missing / generic | Extend Finance’s existing expense records with configurable accounts, folios, site/admin classification, supporting documents, entered-by data, and connected site/project/client/vendor references. |
| Director account | Missing | Add a finance-owned director-account ledger with loan advancement, repayment, balance, folio, date, source, and audit trail. Surface approved HR/management summaries where needed. |
| Daily logbook and month-end reconciliation | Missing | Add transaction-ledger views and reconciliation records that compare ERP transactions with imported bank lines and preserve reconciliation history; do not use a cosmetic badge. |
| Bank statements and analysis | Missing | Add statement and transaction tables, parser/import pipeline, confidence/status, human review, and links to expenses, payments, invoices, loans, payroll, and accounts. AI may classify but may not silently mutate financial records. |
| Local/import/forex procurement | Partially implemented | Vendors, POs, line items, GRN, receiving, inventory, and procurement RPCs exist. Add the missing local/import/forex fields and preserve procurement-to-inventory lineage. VAT on over-the-counter purchases must remain a configurable business rule, not an invented default. |
| Salary schedule and payroll | Partially implemented | HR records salary payments with a statutory calculator. Add schedule rows, bank/account, deductions, approval/payment state, configurable period, and actual payroll-to-payslip lineage. |
| Staff loans and external loans | Missing | Add loan master, repayment schedule, repayment transaction, balance calculation, completion state, and payroll linkage. External loans remain finance-owned and support lender/account/document references. |
| Overtime | Missing | Add employee/month/rate/days/earnings/account/bank records, using a configurable working-day basis rather than a hard-coded policy. Connect approved overtime to payroll and worker payments. |
| Payslips | Missing | Generate from approved payroll data; do not maintain an independent manually entered payslip dataset. |
| HMO | Missing | Add HR-owned biannual schedule, employee/family classification, effective period, amount, and HR-controlled updates with policy fields configurable. |
| MD leave approval and disciplinary final decision | Incorrectly wired relative to requirement | Current HR can approve leave and edit disciplinary records. Add explicit approval routing and final-decision state so MD authority cannot be bypassed. The MD identity and approval policy remain configurable. |
| VAT schedule and Nigerian state/LGA mapping | Missing | Add a finance/tax schedule with configurable tax fields, state and dynamic LGA data, linked invoices/expenses, and audit history. Do not invent tax rates or statutory interpretations. |
| Auditability, mobile UX, documents, analytics, and permissions | Partially implemented | Existing audit events, document registry, PDFs, charts, and responsive shell provide foundations. Extend them consistently and verify with role-specific end-to-end tests. |

## Implementation phases

### Phase 0 — Synchronize and re-audit the current state

Before editing, fetch the latest `LRDMX69/nifhdpe` branch and confirm the working tree, merged PRs, current HR branch, and the latest migration sequence. Regenerate Supabase types through the user’s Lovable Cloud workflow if the live migrations changed generated contracts. Re-run a read-only schema comparison against the repository migrations and classify each requested item using the status matrix above. No implementation should begin until current code and live schema are aligned.

### Phase 1 — Establish shared data contracts and permissions

Add only the database structures that are necessary for real workflows. Use organization-owned tables, foreign keys to existing client/user/project/vendor/invoice/payment records, indexes for the main reporting paths, explicit status transitions, and immutable audit/revision records. Use Supabase Storage for attachments and store metadata plus storage references rather than file bytes in database columns.

The core contract groups will be:

| Contract group | Native owner | Main relationships |
|---|---|---|
| Client and commercial extensions | Clients / Quotations | Client → PO metadata → quotation → sales order → invoice → payment → balance |
| Document and revision extensions | Native document-owning modules | Entity → immutable revision snapshots → active version |
| Expense and money-source ledger | Finance | Account → folio transaction → expense/payment/reporting |
| Bank analysis and reconciliation | Finance | Statement → bank line → review/classification → linked ERP transaction → reconciliation |
| Payroll and HR schedules | HR with Finance linkage | Employee → salary/overtime/loan/HMO → approval → payment/payslip/reporting |
| Leave and disciplinary approvals | HR / MD approval authority | Request/case → HR review → MD decision → history |
| Procurement extensions | Procurement | PO/import/local/forex record → GRN → inventory/stock movement |
| Tax/VAT schedules | Finance | Invoice/expense/procurement/payment → VAT schedule → state/LGA/tax reporting |

Every new table and RPC must have organization-scoped RLS, role-aware policies, audit events, safe mutation functions where multiple rows must be atomic, and explicit grants. HR access should be added at the narrowest business capability, reusing the existing `has_org_role` mapping where appropriate and introducing separate role checks for MD-only approval actions.

### Phase 2 — Complete client, quotation, invoice, proforma, and waybill connectivity

Extend the existing Clients surface so HR can create and maintain central client records. Add TIN and approved commercial metadata only where the schema and management policy support them. Allow client PO information and attachments to be stored as linked records, then show the same data through Client 360, Quotations, Sales Orders, Finance, and reports.

Keep all quotation creation, product selection, itemization, revision, and sales-order conversion inside Quotations. Add attachment selection for RQ/ROQ/pricing evidence and include the selected evidence in the generated commercial PDF only when the file is available and permitted. Preserve existing revision logic and make required edit reasons, current-version state, and audit history consistent.

Complete the invoice path through the existing Finance components and sales-order RPC. Add automatic invoice numbering, client/PO/order links, configurable VAT/discount/overhead/transport/WHT fields, payment and bank-details sections, and professional PDF output. Implement proforma as a separate document type/sequence that cannot consume official invoice numbers. Extend waybill creation from invoice/order context in Logistics, retaining only delivery information and keeping financial values out of the waybill.

### Phase 3 — Build the Finance-owned expense, bank, procurement, tax, and reconciliation foundation

Extend the existing Finance page rather than creating a new control desk. Add native tabs or contextual panels for expense folios, money source/account master, site and administrative expense classification, director-account transactions, bank statements and analysis, reconciliation, local/import/forex procurement summaries, and VAT schedules. The UI must retain the existing Finance ownership while HR receives the specific oversight cards and actions required by its role.

Bank imports must create statement and bank-line records first. Classification should have statuses such as pending review, suggested, approved, rejected, and linked, with confidence and reviewer fields. AI or parsing may suggest a category, account, vendor, client, invoice, or payment, but only an authorized human approval may create or update a connected financial record. Reconciliation must compare amounts, dates, folios, and linked records and store discrepancy reasons and reconciliation history.

Procurement enhancements must reuse the current vendor, purchase-order, purchase-order-item, GRN, and inventory connectors. Open-market purchases may select an authorized vendor manually. Local, import, forex, VAT, discount, haulage, part-payment, and outstanding fields must remain auditable and configurable, with no invented tax policy.

### Phase 4 — Add HR payroll, loans, overtime, payslips, HMO, leave, and disciplinary workflows

Extend the existing HR page with grouped native sections rather than a collection of new routes. A proposed structure is: Workforce (attendance, leave, employee records), Payroll & Benefits (salary schedules, overtime, loans, payslips, HMO), People Development (recruitment, training, skills, performance, promotions), Employee Relations (disciplinary cases and MD decisions), and Finance & Operations Oversight (client creation shortcut, quotation/order summary, invoice/payment summary, logistics/delivery summary).

The salary schedule must be period-aware and connected to employee profiles, configured bank accounts, gross salary, pension, voluntary contributions, tax, deductions, loan repayment, absenteeism, suspension, other approved deductions, submitter, approval, approver, and payment status. Approved rows become the sole source for payslip generation and worker-payment creation. Overtime must use a configurable working-day basis and feed approved payroll rather than creating an unrelated payment record.

Staff loans must calculate repayment schedules and outstanding balances from issued amount, dates, term, payments, and additional approved loans. Payroll deductions should reference the loan ledger. External loans should remain separate but feed Finance summaries. HMO should provide the requested biannual schedule and employee/family coverage without hard-coding amounts or periods.

Leave requests should be routed to the configured MD approver after HR review or according to the approved policy. Disciplinary cases should expose HR review and a distinct MD final-decision state. Lower-level roles must not be able to mark a case finally approved or rejected. Every decision must be immutable in audit history.

### Phase 5 — Add HR’s contextual commercial and logistics visibility

HR should see a concise live summary inside the HR page, not a copied data store. The Commercial section will show clients created by or assigned to HR, quotation pipeline and accepted values, sales-order status, invoice balances, and recent payment activity with links into the existing Quotations, Clients, and Finance surfaces. The Logistics section will show linked deliveries, dispatch status, scheduled dates, destination/site, vehicle, transport cost where authorized, fuel summaries, and delivery exceptions with a link to Logistics.

These panels will use the same organization-scoped queries and foreign keys as the owning modules. They must not allow HR to bypass Logistics or Finance approval gates. Where HR is authorized to initiate a record, the action should deep-link into the native owner dialog with the client/order/project context preselected.

### Phase 6 — Documents, audit, analytics, and responsive UX

Update the shared NIF PDF engine and native document generators for the completed invoice, proforma, quotation, payslip, VAT, bank/reconciliation, and waybill outputs. Ensure company details, configured bank information, TIN, client information, signatures, revision metadata, and appropriate non-financial waybill content are rendered professionally. Do not place financial values on waybills.

Add monthly and period filters to HR/Finance summaries, ensure charts use year-month keys, and include source links and empty/error states. Use the existing design tokens and responsive shell. HR’s tabs must be horizontally scrollable or grouped on mobile, dialogs must have bounded height and internal scroll, and long names, folios, account numbers, and descriptions must wrap safely.

## Test and certification plan

The implementation will not be marked complete based on compilation alone. Each major workflow will be exercised with authenticated test data in an organization-scoped environment, with cleanup or clearly isolated test records.

| Workflow | Required end-to-end test |
|---|---|
| Client-to-cash | HR creates client → PO metadata/attachment → quotation → approval/sales order → invoice → PDF → payment → balance/client history/report update |
| Commercial evidence | Quotation attaches RQ/ROQ/pricing document → PDF includes permitted evidence → revision preserves original and records reason/editor/time |
| Proforma/waybill | Create proforma without consuming invoice sequence → create invoice/order-linked waybill → verify delivery-only fields and no financial totals |
| Expense and bank | Create configured account → expense with folio/source → import bank statement → parser suggestion → human review → linked record → reconciliation discrepancy/history |
| Procurement/inventory | Local/import/forex record → PO/items → GRN partial/full receipt → inventory and stock movement → outstanding/part-payment update |
| Payroll | Configure employee/bank → salary schedule → overtime → loan deduction → approval → payment → payslip → remaining loan balance |
| Leave and discipline | Employee submits leave/case → HR review → MD final decision → notifications/status/history; verify lower roles cannot bypass decision |
| HR oversight | HR views live clients/quotations/orders/invoices/payments/logistics without duplicate data and opens native owner dialogs with context |
| Security | Test every relevant role, organization isolation, RLS for each new table/RPC, attachment access, and MD-only transition gates |
| Responsive/documents | Validate HR, Finance, Quotations, and Logistics at mobile and desktop sizes; inspect PDFs for clipping, numbering, totals, and signatures |

The final repository checks will include typecheck, strict typecheck, lint, unit/integration tests, production build, dependency audit, `git diff --check`, and a repository scan for TODO/FIXME/mock/fake/simulation/placeholder/demo data/temporary bypasses/dead routes. Any remaining policy-dependent or externally unverifiable item will be reported explicitly rather than certified as complete.

## Management-policy decisions that must remain configurable

The implementation will not invent or silently choose VAT rates, WHT basis or applicability, company TIN, bank account details, account activation, tax category meanings, payroll working-day basis, salary allowances, pension/tax policy, HMO amounts/periods, loan interest or repayment policy, MD identity and approval chain, leave entitlements, disciplinary sanctions, document validity periods, credit limits, warranty terms, or whether particular expenses are recoverable. These will be represented as controlled configuration or required explicit inputs, with approval and audit history where appropriate.

## Assumptions and risks

The user will apply any new Supabase migrations and refresh the schema cache through Lovable Cloud. Generated Supabase types may need regeneration after the live migration set is confirmed. The Vercel deployment is partner-owned, so deployment verification will require the partner to merge/deploy and confirm production asset behavior. Bank statement parsing and AI suggestions require human review by design. Existing production data may contain incomplete client, invoice, payroll, or vendor records; migrations will use nullable/backfill-safe fields and the implementation will surface data-quality exceptions instead of guessing values.

The first execution step after approval is to pull the latest repository state, verify the current branch and merged changes, compare generated types with the now-live schema, and produce a final implementation checklist from this plan. No new standalone control desk or duplicate HR/Finance/Logistics data store will be introduced.
