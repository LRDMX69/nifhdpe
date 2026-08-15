## Projects — 2026-08-15

**URL:** `/projects`  
**Result:** Loaded successfully in the authenticated administrator session. No blank screen or infinite loading observed.  
**Visible behavior:** Page header, refresh, CSV export, New Project, help banner, search input, status dropdown, and an empty-state Create First Project action are present. The empty state explains that projects connect field reports, deliveries, requisitions, expenses, and P&L.  
**Data state:** 0 active, 0 completed, 0 total.  
**Issues observed:** No functional defect from read-only inspection. Project creation and downstream propagation remain untested in this pass.

## Equipment — 2026-08-15

**URL:** `/equipment`  
**Result:** Loaded successfully in the authenticated administrator session.  
**Visible behavior:** Refresh, Add, CSV, PDF, help banner, summary cards, and empty-state messaging render.  
**Data state:** 0 total, 0 in use, 0 available, 0 maintenance, 0 pending requests.  
**Issues observed:** No functional defect from read-only inspection. Equipment creation, requests, maintenance, and role restrictions remain untested.

## Field Reports — 2026-08-15

**URL:** `/field-reports`  
**Result:** Loaded successfully with 2 reports on file and 0 awaiting review.  
**Visible behavior:** Refresh and help controls render; summary cards show Reports Today 0, This Week 2, Active Crews 0, Incidents 2. Two General Report cards are visible.  
**Potential data-quality concern:** Both displayed report entries contain informal/raw text (`We were just chilling in the block`, `Twas cool we all had em strapped in`) while the page describes structured reports. This may be synthetic/test data rather than a defect, but it should be reviewed for production data hygiene.  
**Issues observed:** No runtime failure. Report submission, review, and photo handling remain untested.

## HSE — 2026-08-15

**URL:** `/hse`  
**Result:** Loaded successfully.  
**Visible behavior:** Incidents and Toolbox Talks tabs, Refresh, and Report Incident action render. The incident register empty state is clear.  
**Data state:** 0 open incidents, 0 toolbox talks logged.  
**Issues observed:** No read-only runtime defect. Incident reporting, toolbox-talk creation, and tab behavior remain untested.

## Compliance — 2026-08-15

**URL:** `/compliance`  
**Result:** Loaded successfully.  
**Visible behavior:** Refresh, Add Document, help guidance, summary cards, and upload-first-document action render.  
**Data state:** 0 documents tracked, 0 expiring within 30 days; Valid 0, Pending 0, Expired 0.  
**Issues observed:** No read-only runtime defect. Document upload, expiry calculation, and role restrictions remain untested.

## Pipe Calculator — 2026-08-15

**URL:** `/calculator`  
**Result:** Loaded successfully with HDPE selected and 110mm selected.  
**Visible behavior:** Pipe type and diameter dropdowns, numeric Length (meters) and Flow Rate (L/s) inputs, Calculate action, and HDPE specification table render. The table lists diameters 63–315mm with thickness, pressure, and weight/m.  
**Issues observed:** No read-only runtime defect. Numerical calculation output and invalid-input validation remain untested.

## Pipe Calculator default run — 2026-08-15

**Inputs observed:** HDPE, 110mm, Length 100m, Flow Rate 5 L/s.  
**Outputs observed:** Pressure Rating 16 bar, Flow Velocity 0.79 m/s, Head Loss 0.68 m, Total Weight 314 kg.  
**Status:** Output rendered successfully. Manual formula verification and invalid-input handling remain pending.

## BOQ — 2026-08-15

**URL:** `/boq`  
**Result:** Loaded successfully.  
**Visible behavior:** Refresh and New BOQ controls render with the empty state.  
**Data state:** 0 BOQs, 0 approved.  
**Issues observed:** No read-only runtime defect. BOQ creation, line-item calculations, approvals, exports, and project propagation remain untested.

## Opportunities — 2026-08-15

**URL:** `/opportunities`  
**Result:** Loaded successfully after a transient skeleton/loading state. The stabilized page shows 643 live opportunities, top relevance 10, pipeline value ₦2,535,510,000,000.00, Active Bids 0, Won 0, and Total Tracked 643.  
**Visible behavior:** Export CSV, Refresh, Print, Add, help guidance, status tabs (All, Identified, Bidding, Won, Lost), AI intelligence panel, and populated opportunity cards render.  
**Data state:** The initial viewport briefly showed zero metrics and skeleton cards before settling; this is a loading transition rather than a confirmed defect.  
**Issues observed:** No stabilized desktop runtime failure. Mobile overflow, opportunity-to-quotation conversion, and data authenticity require further testing.

## Quotations — 2026-08-15

**URL:** `/quotations`  
**Result:** Loaded successfully with an empty quotation register.  
**Visible behavior:** Export CSV, Proforma, New Quotation, refresh, help guidance, technical catalogue access, search, and empty-state New quotation actions render. The page explicitly describes Draft → Send → accepted sales order → stock → invoice flow.  
**Data state:** 0 awaiting client, 0 accepted of 0.  
**Issues observed:** No read-only runtime defect. Quotation creation, proforma lifecycle, PDF output, numbering, acceptance, and downstream propagation remain pending.

## Clients — 2026-08-15

**URL:** `/clients`  
**Result:** Loaded successfully with an empty client directory.  
**Visible behavior:** Add Client, refresh, help guidance, CRM AI panel, follow-up prompt, search, and empty-state Add first client action render. The page states that clients are prerequisites for quotations, invoices, and opportunities.  
**Data state:** 0 clients in directory.  
**Issues observed:** No read-only runtime defect. Client creation, required-field validation, Client 360 propagation, and downstream sales workflow remain pending.

## Inventory — 2026-08-15

**URL:** `/inventory`  
**Result:** Loaded successfully with an empty stock register.  
**Visible behavior:** Export CSV, Location, Box, Add Item, refresh, help guidance, Find Item input, Inventory AI panel, follow-up prompt, search, type filter, and empty-state Add first item action render.  
**Data state:** 0 SKUs tracked, 0 below minimum, Total Items 0, Low Stock 0, Total Value ₦0.00.  
**Issues observed:** No read-only runtime defect. Inventory item setup, GRN/stock movement, reservation, delivery deduction, and propagation remain pending.

## Logistics — 2026-08-15

**URL:** `/logistics`  
**Result:** Loaded successfully with an empty delivery queue.  
**Visible behavior:** CSV, New Waybill, refresh, help guidance, Deliveries/Fleet/Fuel Log tabs, delivery search, status filter, New Delivery, and Schedule delivery actions render.  
**Data state:** 0 in transit, 0 delivered, 0 vehicles; no deliveries scheduled.  
**Issues observed:** No read-only runtime defect. Delivery creation, waybill issuance/print/reprint, fleet, fuel, stock deduction, and migration-dependent workflows remain pending.

## Finance — 2026-08-15

**URL:** `/finance`  
**Result:** Loaded successfully with zero-value finance data.  
**Visible behavior:** CSV, Export PDF, New Invoice, Log Payment, Log Expense, refresh, help guidance, Overview/Invoices/Receipts/Expenses/Payments/Bank Analysis tabs, and date range controls render. The page documents the quotation → invoice → receipt/payment → expense/worker payment cashflow.  
**Data state:** 0 unpaid invoices, 0 recent payments; Total Revenue ₦0.00, Total Received ₦0.00, Receivables ₦0.00, Net Cash Position ₦0.00; aging buckets all ₦0.00.  
**Issues observed:** No read-only runtime defect. Each tab, invoice/payment/expense entry, bank import/analysis, VAT, calculation integrity, and PDF output remain pending.

## Procurement — 2026-08-15

**URL:** `/procurement`  
**Result:** Loaded successfully with empty vendor, PO, goods-received, and requisition data.  
**Visible behavior:** Refresh, help guidance, Vendors/Purchase Orders/Goods Received/Requisitions tabs, Add Vendor, and Register first vendor actions render. The page describes the vendor → requisition → PO → GRN → inventory lifecycle.  
**Data state:** 0 vendors, 0 open POs, 0 pending requisitions.  
**Issues observed:** No read-only runtime defect. Vendor creation, PO approval, GRN posting, inventory update, and role restrictions remain pending.

## Analytics — 2026-08-15

**URL:** `/analytics`  
**Result:** Loaded successfully with zero-value data and rendered charts.  
**Visible behavior:** Refresh, date range inputs, KPI cards, Cash Flow — Billed vs Collected chart, Monthly Revenue vs Expenses chart, Inventory by Pipe Size, Quotation Conversion, and Top Clients by Accepted Value sections render.  
**Data state:** 0 accepted quotes, 0 inventory SKUs; Billed ₦0.00, Collected ₦0.00, Net Profit ₦0.00, Inventory Value ₦0.00. No-data messages render for inventory, quotation conversion, and accepted clients.  
**Issues observed:** No read-only runtime defect. KPI reconciliation against created transactions and date-filter behavior remain pending.

## HR — 2026-08-15

**URL:** `/hr`  
**Result:** Loaded successfully with zero-value HR and connected finance/operations data.  
**Visible behavior:** Request Leave, refresh, Check In, Salary & Overtime/Loans/HMO/Accounts/VAT Schedule workspace tabs, Salary schedule, Overtime, Clients, Quotations, Logistics, Finance/bank actions, and the full HR tabs (Attendance, Leaves, Payroll, ID Cards, Performance, Recruitment, Training, Skills, Disciplinary, Promotions) render.  
**Data state:** 0 checked in, 0 pending leave; no salary/overtime rows; 0 clients, accepted quotations ₦0.00, outstanding invoices ₦0.00, active deliveries 0; statements 0, bank lines 0, pending review 0, director balance ₦0.00; no holidays.  
**Issues observed:** No read-only runtime defect. Role-specific HR behavior, leave approval/audit, payroll calculations, VAT schedule, bank analysis, and connected record creation remain pending.

## Claims — 2026-08-15

**URL:** `/claims`  
**Result:** Loaded successfully with an empty claims register.  
**Visible behavior:** Refresh, Inbox/My Submissions tabs, summary cards, and clear empty-state guidance render.  
**Data state:** 0 pending, 0 approved, 0 flagged; Pending 0, Total Claims 0, Approved Total ₦0.00.  
**Issues observed:** No read-only runtime defect. Claim submission, review, approval, flagging, and payment linkage remain pending.

## Messages — 2026-08-15

**URL:** `/messages`  
**Result:** Loaded successfully with one visible message and no unread messages.  
**Visible behavior:** Search conversations, New Chat, Broadcast, refresh, help guidance, and a conversation card from Oluwakemi Hassan displaying `Hey` render.  
**Data state:** 1 message in scope, 0 unread across threads.  
**Issues observed:** No read-only runtime defect. Chat creation, broadcast authorization, send/receive propagation, and unread behavior remain pending.

## Document Registry — 2026-08-15

**URL:** `/documents`  
**Result:** Loaded successfully but displayed a confirmed source-load warning: `Some document sources could not be loaded (revisions, proforma, waybill). Other documents are shown below — try refreshing.`  
**Visible behavior:** Search, date filters, CSV export, tabs for 13 document types including Proforma Invoice and Waybill, operational revision history, and empty registry state render.  
**Data state:** 0 numbered documents and 0 revisions.  
**Confirmed issue:** The live registry cannot load revision, proforma, and waybill sources in the current state. This is consistent with the inherited note that the relevant live schema/RPC coverage may be incomplete, but it is a production-visible failure and must be marked FAIL or BLOCKED with exact migration/schema evidence after source inspection.

## Settings — 2026-08-15

**URL:** `/settings`  
**Result:** Loaded successfully with one active team member and no pending role requests.  
**Visible behavior:** Organization, Team, Profile, Policy, User Feedback tabs, refresh, help guidance, and visible role/removal/termination controls render. The current team list shows Oluwakemi Hassan with HR role.  
**Data state:** 1 active team member, 0 pending role requests.  
**Issues observed:** No read-only runtime defect. Role mutation safety, policy/profile persistence, and permission propagation remain pending.

## Console and workflow-test checkpoint — 2026-08-15

The browser console review after the primary route pass returned no console output. The Pipe Calculator has been reopened for controlled non-mutating calculation and validation tests in the workflow phase.

## Pipe Calculator controlled calculation — 2026-08-15

**Inputs:** HDPE, 110mm, 200m, 10 L/s.  
**Observed outputs:** 16 bar, flow velocity 1.57 m/s, head loss 4.87 m, total weight 628 kg. Total weight matches 3.14 kg/m × 200m. Velocity is consistent with an approximately 90mm internal diameter (110mm nominal minus two 10mm wall thicknesses), not the 110mm outer diameter; source/formula verification is required before marking pass.

## Pipe Calculator zero-input validation — 2026-08-15

**Inputs:** Length 0m, Flow Rate 0 L/s.  
**Observed behavior:** The calculator accepted both values and displayed Pressure Rating 16 bar, Flow Velocity 0.00 m/s, Head Loss 0.00 m, Total Weight 0 kg. No validation message or disabled state appeared.  
**Finding:** This is a production-quality validation gap for an engineering calculator: zero-length/zero-flow input is accepted and presented as a valid calculated result. Negative values remain untested. Source confirms the inputs have no `min` constraints and `handleCalculate` only sets the calculated flag.

## Add Client form inspection — 2026-08-15

The live Add Client dialog opens without error. It exposes required Company Name plus Contact Person, Phone, Email, Address, optional TIN, State, Local Government, Cancel, and Save Client. No production record was saved. Controlled end-to-end workflow execution is paused pending confirmation because creating client/quotation/invoice/payment records changes live business data.

## Authenticated live schema verification — 2026-08-15

Using the already authenticated browser session, direct REST checks returned HTTP 200 with empty arrays for `waybills`, `client_document_sequences`, `proforma_invoices`, `hr_salary_schedules`, `hr_staff_loans`, `vat_schedule_entries`, `leave_requests`, `disciplinary_records`, `bank_statements`, and `bank_transactions`. This proves the current live deployment can reach the newly migrated tables under the signed-in session. A probe for `invoice_revisions` returned HTTP 404/PGRST205, indicating that exact table name is absent; the Document Registry warning's `revisions` source may use a different relation or may reflect a real missing relation. Source inspection is required.

## UAT test-data entry checkpoint — 2026-08-15

The latest live page reload retained the authenticated administrator session. A synthetic Add Client form population attempt did not write data: the targeted element indices were stale after the modal closed/re-rendered, all six fills were rejected as non-fillable page elements, and the client directory remains at 0 records. No Save Client action was invoked.

## UAT client form populated — 2026-08-15

The authorized synthetic client form is populated successfully with a UAT-only company name, contact, phone, invalid-test email domain, UAT address, and UAT TIN. State and Local Government remain `Not specified`; no record has been saved yet.

## Client creation propagation — 2026-08-15

**Result:** PASS for client creation persistence. The live UI displayed `Client added`, changed the directory to 1 client, and rendered the UAT client card with the supplied company name, contact, phone, email, and address. This client is now the controlled test anchor for downstream quotation, proforma, invoice, payment, and logistics workflow checks.

## New Quotation form inspection — 2026-08-15

The live New Quotation modal opens successfully with Itemized/Lump Sum tabs, Client selector currently `Select client`, opportunity link, pipe type, profit margin, line items, labor, transport, discount, overhead/site cost, tax, site/project reference, payment terms, assumptions, exclusions, terms and conditions, and Save Draft/Save & Send actions. The form exposes the requested overhead and commercial fields. Default calculated display shows Subtotal ₦0.00, Labor ₦0.00, Transport ₦50,000.00, Profit (15%) ₦7,500.00, Grand Total ₦57,500.00 despite no items; this default behavior requires source/formula review before finalizing the quotation test.

## Client-to-quotation propagation — 2026-08-15

**Result:** PASS for selector propagation. The New Quotation client selector listed `UAT - NIFHDPE QA 2026-08-15`, and selecting it populated the quotation form with that client. No quotation has been saved yet.

## Controlled quotation calculation — 2026-08-15

**Inputs:** 1 item × 10 × ₦12,000 = ₦120,000 subtotal; labor 10 × ₦500 = ₦5,000; transport ₦50,000; profit margin 15%; discount ₦1,000; overhead ₦20,000; tax 7.5%.  
**Independent expected result:** Profit base ₦175,000; profit ₦26,250; base commercial total ₦201,250; discount ₦1,000; taxable total ₦220,250; tax ₦16,518.75; grand total ₦236,768.75.  
**Observed UI:** Subtotal ₦120,000.00, Labor ₦5,000.00, Transport ₦50,000.00, Profit (15%) ₦26,250.00, Grand Total ₦236,768.75.  
**Status:** PASS for the tested quotation calculation. The modal does not show all summary rows in the extracted viewport, but the grand total matches the independent calculation.

## Quotation persistence — 2026-08-15

**Result:** PASS for quotation save/send persistence. The live page shows `1 awaiting client · 0 accepted of 1`, quotation number `QUOTATIONS/2026/0001`, client `UAT - NIFHDPE QA 2026-08-15`, date 8/15/2026, total ₦236,768.75, and status `sent`. The form reset/closed after the save completed.

## Quotation-to-proforma dependency — 2026-08-15

The Create Proforma Invoice dialog opens successfully, and its source quotation selector lists `QUOTATIONS/2026/0001 · UAT - NIFHDPE QA 2026-08-15 · ₦236,768.75`. This confirms the sent quotation is available for controlled proforma issuance.

## UAT proforma form populated — 2026-08-15

The proforma dialog is populated against `QUOTATIONS/2026/0001`, with valid-until date 2026-09-15 and a UAT-only note. No proforma record has been issued yet.

## Proforma issuance — 2026-08-15

**Result:** PASS for proforma issuance and quotation linkage. The live page shows `PROFORMA_INVOICES/2026/0001`, client `UAT - NIFHDPE QA 2026-08-15`, status `issued`, amount ₦236,768.75, issue date 2026-08-15, and valid-until 2026-09-15. The UI exposes `Accept & create invoice` and `Cancel`, matching the intended proforma lifecycle.

## Proforma-to-invoice conversion — 2026-08-15

**Result:** FAIL — the live UI confirms the proforma was accepted and a linked invoice was generated, but the propagated amount is inconsistent. Source quotation/proforma total: ₦236,768.75. Generated invoice `INVOICES/2026/0001` shows Gross/Net ₦205,518.79, Balance ₦205,518.79, status unpaid, and client UAT - NIFHDPE QA 2026-08-15. Difference from the source total is ₦31,249.96. The linked invoice record is present, but automatic financial normalization or field mapping requires root-cause analysis and a fix/retest.

## Invoice propagation database evidence — 2026-08-15

Authenticated REST inspection confirms the source records are linked: quotation `a4db1056-8c32-486b-3bda-0243204108f8` (live ID captured in console evidence), proforma `1b36dd43-67fc-4caf-a21d-76f9665d36be`, and invoice `96e50307-72f9-4f79-abee-d6129f272caf`. The proforma stored `total_amount = 236768.75`; the invoice stored `subtotal = 120000`, `transportation_cost = 50000`, `overhead_amount = 20000`, `discount_amount = 1000`, `taxable_amount = 189000`, `tax_amount = 16518.79`, and `total_amount/net_amount/balance_due = 205518.79`. The invoice item correctly copied 10 × ₦12,000 = ₦120,000. This is a reproducible data-integrity defect in proforma-to-invoice financial field mapping/normalization, not a UI-only display issue.

## Payment form/account prerequisite — 2026-08-15

The invoice payment dialog opens with the correct outstanding amount ₦205,518.79, bank-transfer method, current date, required receiving bank/cash account, reference, notes, and Record & Issue Receipt action. Opening the receiving-account selector shows only `Select an account`; no actual account is available. This is a live workflow blocker for payment creation and bank-analysis propagation, and it contradicts the expectation that the migrated finance-account connector is ready. An account must be created through the intended Finance/HR account workflow or this test remains blocked.

## HR Accounts tab — 2026-08-15

The intended Finance & Benefits Accounts tab loads successfully and shows `No money sources configured`, with a `Money source` creation action and workflow settings. The page explicitly says approved company accounts must be added before salary, expense, bank, or procurement transactions can be recorded. This confirms the payment blocker is an unconfigured live account state rather than a missing route.

## UAT money source form populated — 2026-08-15

The authorized synthetic money-source form is populated with account name `UAT QA Bank Account 2026-08-15`, account number `UAT-ACCOUNT-20260815`, currency NGN, and Bank type. No account has been saved yet.

## Money source persistence — 2026-08-15

**Result:** PASS for finance-account creation. The live HR Accounts tab displayed `Finance account added` and now shows `UAT QA Bank Account 2026-08-15`, NGN, bank, account number `UAT-ACCOUNT-20260815`. This should unblock the invoice receipt and bank-analysis workflow.

## Payment account propagation — 2026-08-15

The invoice payment dialog now lists `UAT QA Bank Account 2026-08-15 · UAT-ACCOUNT-20260815` as a selectable receiving account. The finance-account creation propagated into the payment workflow successfully; the payment itself has not yet been recorded.

## UAT payment form completed — 2026-08-15

The payment dialog is fully completed for the invoice outstanding balance ₦205,518.79, using bank transfer, receiving account `UAT QA Bank Account 2026-08-15`, reference `UAT-PAY-20260815-0001`, and a UAT-only note. The receipt has not yet been issued.

## Payment propagation — 2026-08-15

**Receipt event:** PASS for receipt issuance. The UI reported `Payment recorded` and `Receipt RECEIPTS/2026/0001 issued`; the invoice row changed to `paid`, with balance ₦0.00 and Paid ₦205,518.79.  
**Propagation defect:** FAIL for Finance summary reconciliation. After the payment settled and the row became paid, the page still displayed Total Received ₦0.00, Receivables ₦205,518.79, and Net Cash Position ₦0.00, while showing 0 unpaid invoices. This stale aggregate state persisted through a page view and requires refresh/invalidation root-cause analysis.

## Payment aggregate refresh retest — 2026-08-15

**Retest result:** PASS after explicit refresh. The refreshed Finance page now shows Total Received ₦205,518.79, Receivables ₦0.00, Net Cash Position ₦205,518.79, 0 unpaid invoices, and the paid invoice balance ₦0. The initial post-payment stale summary is therefore a query-invalidation defect in the immediate success path, not a persisted database calculation error.

## PDF download confirmation — 2026-08-15

The live Finance invoice action produced `invoice-invoices_2026_0001-INVOICES_2026_0001.pdf`, and the receipt issuance produced `payment-receipt-—-receipts_2026_0001-RECEIPTS_2026_0001.pdf`; both appear completed in browser download history. Local file inspection is next.

## Invoice and receipt PDF inspection — 2026-08-15

**Invoice PDF (`INVOICES/2026/0001`)**  
The downloaded invoice is a 2-page A4 PDF. It uses branded NIF artwork, but the inspected content confirms the same financial mismatch as the live invoice row: taxable amount ₦189,000.00, tax ₦16,518.79, gross total ₦205,518.79, amount received ₦205,518.79, and balance due ₦0.00. The PDF therefore faithfully reflects the stored invoice defect rather than the source quotation/proforma total. Visually, the layout is cleaner than earlier basic output, but there are still professional-quality issues: page 2 is mostly empty, signature labels are tiny, the approval/date area is poorly spaced, and the tax/currency glyph rendering is inconsistent in extracted text.

**Receipt PDF (`RECEIPTS/2026/0001`)**  
The downloaded receipt is also a 2-page A4 PDF. It correctly reflects the recorded payment event, including client, invoice reference, payment amount ₦205,518.79, method BANK TRANSFER, reference `UAT-PAY-20260815-0001`, payment date 2026-08-15, and outstanding balance ₦0.00. Visually, page 1 is acceptable and branded, but page 2 is almost entirely empty except for signature lines and stamp, which is not production-efficient. The receipt also exposes an internal/operator identity block (`stanleyvic13@gmail.com`, `Accounts`) at the top, which may or may not be intended for customer-facing receipts and should be reviewed as a document-design/privacy decision.

## Bank statement import setup — 2026-08-15

The live HR bank-statement import dialog is available with account, period start/end, statement reference, opening/closing balance, and optional CSV lines. The synthetic UAT bank account `UAT QA Bank Account 2026-08-15 · UAT-ACCOUNT-20260815` is selectable, and the UI explicitly states imported CSV lines become pending-review lines and do not auto-link or post a payment.

## UAT bank statement form completed — 2026-08-15

The controlled statement is populated for `UAT QA Bank Account 2026-08-15`, period 2026-08-15 to 2026-08-15, reference `UAT Statement 2026-08-15 - Receipt linkage`, opening balance ₦1,000,000.00, closing balance ₦1,205,518.79, and one credit line for ₦205,518.79 with reference `UAT-PAY-20260815-0001`. The statement has not yet been imported.

## Bank statement import propagation — 2026-08-15

**Result:** PASS for statement ingestion. The live UI reported `Bank statement imported — 1 transaction line(s) queued for review.` HR now shows Statements 1, Bank lines 1, Pending review 1, and a pending UAT line `UAT payment for INVOICES/2026/0001`, status `pending_review`, direction +, amount ₦205,518.79, with Approve and Reject actions. The system correctly did not auto-link the line to the receipt.

## Bank line approval — 2026-08-15

**Result:** PASS for review transition. The UI reported `Bank line approved`; Pending review changed from 1 to 0, the UAT line status became `approved`, amount remained +₦205,518.79, and `Link ERP record` became available. This confirms human review is separate from ERP linking.

## Bank-link target identified — 2026-08-15

The approved UAT bank line's ERP-link dialog defaults to invoice type and requires an existing ERP record UUID plus linked amount. The authenticated live query returned the exact UAT invoice: UUID `96e50307-72f9-4f79-abee-d6129f272caf`, document `INVOICES/2026/0001`, total_amount 205518.79, balance_due 0, status `paid`. No access token values were exposed in the audit log.

## Bank line reconciliation link — 2026-08-15

**Result:** PASS. The UI reported `Bank line linked — The ERP record and bank analysis now share an auditable link.` The UAT line status changed to `linked`, retained +₦205,518.79, and remained visible in the HR oversight. This proves statement import → review → approval → exact ERP-record linkage works without creating a duplicate transaction.

## Finance Bank Analysis propagation — 2026-08-15

**Result:** PASS. Finance now shows Reviewed bank lines 1, Linked lines 1, Awaiting ERP connection 0. The existing ERP connections table lists the 2026-08-15 UAT payment line, ERP type `invoice`, exact invoice UUID `96e50307-72f9-4f79-abee-d6129f272caf`, and linked amount ₦205,518.79. Finance aggregates remain reconciled at Total Received ₦205,518.79, Receivables ₦0.00, and Net Cash Position ₦205,518.79.

## Procurement vendor setup — 2026-08-15

The live Procurement page initially had 0 vendors, 0 open POs, and 0 pending requisitions. Its Vendor Master states a vendor must be registered before a PO can be issued. The vendor form requires a name and offers email, phone, category, and address fields.

## UAT vendor creation — 2026-08-15

**Result:** PASS. The UI reported `Vendor added`; Procurement now shows 1 vendor and the active supplier card `UAT Supplier HDPE 2026-08-15` with the entered UAT-only contact details. The vendor dependency is persisted for PO creation.

## Purchase order form inspection — 2026-08-15

The live New PO form exposes the registered vendor selector, procurement mode, vendor invoice number, accounting folio, site/project reference, VAT amount, haulage cost, amount paid, and itemized order lines with item name, specification, quantity, unit, and unit price. The form displays line and PO totals before creation. No PO has been saved yet.

## PO vendor selector interaction — 2026-08-15

The PO vendor field is rendered as a native select with the UAT supplier option present. The dedicated dropdown-selection action did not locate the element and coordinate/keyboard selection did not commit; a controlled DOM change event successfully set the selector to `UAT Supplier HDPE 2026-08-15` with vendor UUID `41e999d7-e224-45e2-bea1-0cbbbc86e1d9`. This is a testability/automation friction point, not yet a user-facing defect.

## UAT purchase order creation — 2026-08-15

**Result:** PASS for PO persistence. The UI reported `Purchase Order created — 1 line item added`; Procurement now shows 1 open PO, document `PURCHASE_ORDERS/2026/0001`, draft status, UAT supplier, and displayed amount ₦120,000. The controlled line calculation 8 × ₦15,000 = ₦120,000 matched the line and displayed PO total. The entered VAT ₦9,000 and haulage ₦5,000 were accepted as metadata but were not included in the displayed PO total; this requires source/data verification because an industrial PO total may be expected to include them.

## UAT GRN attempt — 2026-08-15

**Result:** FAIL. Clicking `Receive GRN` on `PURCHASE_ORDERS/2026/0001` produced the live error `This purchase order has no outstanding line items to receive.` The PO remains draft with 1 open PO and displayed total ₦120,000. This is a confirmed procurement-to-goods-receipt connectivity defect; the next step is to inspect the stored PO and PO-line fields and the GRN query criteria.

## GRN failure root-cause analysis — 2026-08-15

Repository review confirms the direct PO-card `Receive GRN` button calls `receiveGoods.mutate(po.id)` without setting `grnPoId` or loading `grnLineItems`. The mutation immediately rejects when `grnLineItems.length === 0`, so the direct action deterministically produces `This purchase order has no outstanding line items to receive.` The dedicated Goods Received dialog does set `grnPoId` and queries `purchase_order_items`; it will be used for a second live retest. This is a confirmed UI wiring defect in the PO-card action.

## Dedicated GRN dialog retest setup — 2026-08-15

The dedicated Goods Received workflow opens with a pending-PO selector containing `PURCHASE_ORDERS/2026/0001 - UAT Supplier HDPE 2026-08-15` and a Receive GRN action. This confirms the PO is still outstanding and available through the correct dialog path.

## GRN line loading retest — 2026-08-15

**Result:** PASS for dedicated-dialog loading. After selecting the UAT PO, the dialog loaded line `UAT HDPE Pipe 110mm SDR11` with 8 outstanding, accepted quantity default 8, rejected quantity 0, and optional lot/batch. The direct PO-card action remains defective, but the dedicated dialog has the required data for a valid receipt.

## GRN posting/list propagation — 2026-08-15

**Posting:** PASS at mutation level. The UI reported `Goods received — GRN, inventory, lot, stock movement, remaining quantity, PO status, and audit records were updated.`  
**List propagation:** FAIL/INCONSISTENT. After the success event, the Goods Received tab still displayed `No goods received yet`, while the page header remained `1 open POs`; the GRN list did not show the newly created record. This suggests missing GRN query/rendering or invalidation coverage and requires actual-table verification.

## Authenticated GRN database verification — 2026-08-15

The live authenticated session confirms the receipt transaction persisted correctly: PO `PURCHASE_ORDERS/2026/0001` status is `received`; PO item quantity 8 and received_quantity 8; GRN `GOODS_RECEIVED_NOTES/2026/0001` UUID `490c40f6-f4f6-4b51-ad0e-f66beba9289b` status `accepted`; GRN item accepted_quantity 8, rejected_quantity 0, remaining_quantity 0, linked inventory UUID `e434f751-c289-4a33-a1db-d1ff941d3259`; inventory quantity_meters 8 and unit_cost ₦15,000 with note `Created from partial goods receipt`; stock movement type `receipt`, quantity 8, linked to the PO; and business audit event `partial_receipt_posted` exists. The defect is therefore the live GRN list/render query or invalidation, not the receipt mutation or database propagation.

## Inventory propagation from GRN — 2026-08-15

**Result:** PASS. Inventory now shows 1 SKU, total value ₦120,000.00, and the UAT item `UAT HDPE Pipe 110mm SDR11` with quantity 8 and unit cost ₦15,000.00. The configured minimum of 10 correctly makes it the one low-stock item. This verifies PO → GRN → inventory quantity and valuation propagation.

## Waybill workflow setup — 2026-08-15

The live `Issue and print waybill` dialog confirms the durable sequence: save a permanent waybill record, render PDF, then mark it printed; failed rendering is intended to remain retryable. It offers source delivery, sales order, client, and project links, driver, vehicle, destination state/address, site/recipient, project label, items, and notes, but no direct invoice selector. The UAT test will use the existing UAT client and a clearly labelled standalone waybill, then verify Document Registry and print history. Direct invoice-to-waybill linkage is currently not exposed in this dialog.

## Waybill client dependency — 2026-08-15

The waybill client selector exposed the created UAT client and successfully committed `UAT - NIFHDPE QA 2026-08-15`. This confirms client creation propagates to the waybill workflow. The waybill remains standalone with no direct invoice link.

## UAT waybill generation — 2026-08-15

**Result:** PASS for durable waybill issue/print mutation. The UI reported `Waybill generated and recorded — WAYBILLS/2026/0001 is now in the Document Registry and can be reprinted.` The waybill dialog closed after completion. Logistics still shows no scheduled deliveries, which is expected because this was a standalone waybill rather than a delivery record; the registry and database must verify the durable document and print history.

## Document Registry waybill and source warning — 2026-08-15

**Waybill result:** PASS. Document Registry now shows 7 numbered documents, including `WAYBILLS/2026/0001`, type Waybill, destination `UAT QA Delivery Address, Ikorodu, Lagos`, status `Printed`, and a visible `Reprint` action. The registry also lists the UAT PO as `received`, quotation `sent`, invoice `paid`, proforma `accepted`, receipt `issued`, and GRN `accepted`, demonstrating broad document propagation.  
**Revision-source warning:** FAIL/UNRESOLVED. The registry still displays `Some document sources could not be loaded (revisions)` and `0 revisions`; this is a real production data-source issue until the underlying revisions table/query mismatch is explained and fixed or proven intentional.

## Waybill reprint — 2026-08-15

**Result:** PASS. The registry reported `Waybill reprinted — WAYBILLS/2026/0001 copy 2 was generated and recorded.` The same registry row changed to status `reprinted`, retained one numbered waybill record, and continued to expose the Reprint action. The implementation appears to preserve the canonical waybill number while recording print-copy history rather than creating a duplicate numbered document.

## Waybill PDF download confirmation — 2026-08-15

Browser download history now contains both `waybill-—-waybills_2026_0001-WAYBILLS_2026_0001.pdf` and the reprint copy `waybill-—-waybills_2026_0001-WAYBILLS_2026_0001 (1).pdf`, alongside the invoice and receipt PDFs. Both waybill files are completed downloads and will be inspected for content and layout.

## Waybill PDF and reprint inspection — 2026-08-15

The original waybill PDF and the reprinted copy are both 2-page A4 documents and preserve the same canonical document number `WAYBILLS/2026/0001`. The extracted text confirms the original carries the `ORIGINAL` label, while the reprint carries `REPRINT` plus `Print history: copy 2`, which is correct evidence that reprint history is being embedded in the generated document rather than creating a new numbered waybill. Both documents correctly show the UAT driver, vehicle, destination, recipient, project label, and line item `UAT HDPE Pipe 110mm SDR11` quantity 8 m.

Visually, the waybill branding is consistent and stronger than the earlier basic PDFs, but there are still production-quality concerns. Page 1 has excessive whitespace, with the actual cargo table pushed low on the page and key dispatch metadata visually underutilized. Page 2 is almost entirely empty except for signature lines and the company seal. This confirms the document is functionally correct and audit-preserving, but still not layout-efficient or fully polished for industrial documentation standards.

## Salary schedule form — 2026-08-15

The live HR salary dialog exposes employee and money-source selectors, period start/end, gross salary, pension, voluntary contribution, tax, other deductions, loan repayment, employee account number, and a calculated Net payable field. It is ready for a controlled payroll row, but the employee selector must be resolved first.

## Payroll employee selection — 2026-08-15

The salary selector lists organization members `DMX`, `Ola`, and `Oluwakemi Hassan`; the controlled UAT salary row is assigned to `Ola`, which is the signed-in administrator profile. No salary record has been submitted yet.

## Payroll dependencies selected — 2026-08-15

The controlled salary row now has employee `Ola` and money source `UAT QA Bank Account 2026-08-15 · UAT-ACCOUNT-20260815` selected. This confirms both HR member and finance-account dependencies are available in the payroll workflow.

## UAT salary schedule submission — 2026-08-15

**Result:** PASS for salary-row creation and calculation. The UI reported `Salary schedule submitted`; HR shows 1 submitted salary row for Ola covering 2026-08-01 to 2026-08-15, status `submitted`, net payable ₦239,000.00, and an `Approve` action. Independent calculation 300,000 − 24,000 − 5,000 − 30,000 − 2,000 − 0 = ₦239,000.00 matches the live result.

## UAT salary approval — 2026-08-15

**Result:** PASS for HR approval transition. The UI reported `Salary schedule approved`; the row changed to `approved` with net payable ₦239,000.00 and exposed `Create payment`. The next step is to trigger the worker-payment connector and verify the finance record and payment status.

## UAT salary payment — 2026-08-15

**Result:** PASS for salary approval-to-payment transition. The UI reported `Salary payment created`; the HR row changed to `paid` with net payable ₦239,000.00 and a `Payslip` action. Finance worker-payment records and bank/analytics propagation remain to be verified.

## Finance worker-payment propagation — 2026-08-15

**Result:** PASS for HR-to-Finance record creation. Finance Payments lists 2026-08-15, employee Ola, type salary, description `Salary schedule 2026-08-01 to 2026-08-15`, amount ₦239,000.00, and Bank link `Unlinked`. Finance aggregates show Total Revenue ₦205,518.79, Total Received ₦205,518.79, Receivables ₦0.00, and Net Cash Position ₦-33,481.21, which independently equals received ₦205,518.79 minus worker payment ₦239,000.00. The worker-payment row is not yet linked to a bank line/account despite the salary form selecting a money source, which is a potential lineage gap to investigate.

## Salary persistence probe — 2026-08-15

The authenticated live query confirms the UAT salary schedule UUID `0c421d83-5c0b-411d-973c-c596db0f03eb`, employee Ola UUID `778b5542-3be3-4d52-916d-4d29b5e0e056`, net_pay ₦239,000.00, gross ₦300,000.00, deductions as entered, `bank_account_id` `b87098a7-0d68-473c-bb47-ddef057420e5`, employee account number `UAT-EMP-ACCOUNT-20260815`, and status `paid`. A first worker_payments query failed because the table does not have an `employee_id` column; the worker-payment schema must be queried using its actual columns before judging lineage.

## Worker-payment database verification — 2026-08-15

**Confirmed data-integrity defect:** The authenticated `worker_payments` row `WORKER_PAYMENTS/2026/0001` persists `amount` ₦239,000.00 and the expected `bank_account_id` `b87098a7-0d68-473c-bb47-ddef057420e5`, but its payroll-specific fields are all zero: `net_pay` 0, `gross_pay` 0, `basic_salary` 0, `paye_tax` 0, `pension_employee` 0, `pension_employer` 0, `other_deductions` 0, and allowances 0. The description and amount are correct, but a payslip or downstream payroll report using `net_pay` would be wrong. This is a confirmed FAIL requiring a repository/RPC fix and retest.

## Staff-loan workflow setup — 2026-08-15

The live HR Loans tab initially shows `No staff loans` and provides `Staff loan` and `Repayment` actions. The empty state explicitly promises issued loans, repayment schedules, payroll deductions, and outstanding balances; no UAT loan has been created yet.

## Staff-loan employee selector — 2026-08-15

The Staff loan dialog exposes employee and money-source selectors, amount issued, additional loan, repayment period, start date, notes, and a calculated monthly repayment. The available members are DMX, Ola, and Oluwakemi Hassan; the UAT loan will use Ola.

## UAT staff loan creation — 2026-08-15

**Result:** PASS for staff-loan creation and monthly repayment calculation. HR reported `Staff loan recorded`; Ola has an active loan started 2026-08-15 over 3 months with balance ₦60,000.00 and a `Repay` action. The form calculated monthly repayment ₦20,000.00, matching 60,000 ÷ 3.

## UAT loan repayment — 2026-08-15

**Result:** PASS for repayment posting and balance arithmetic. HR reported `Loan repayment recorded`; the active Ola loan balance reduced from ₦60,000.00 to ₦40,000.00 after the controlled ₦20,000 repayment. The repayment record and worker-payment propagation still require verification in authenticated tables and Finance.

## Loan-repayment database verification — 2026-08-15

The live tables confirm the UAT loan `a14e59ff-cf9a-4df3-b8d9-c7c9d76ee538` has amount ₦60,000.00, monthly repayment ₦20,000.00, `payments_made` ₦20,000.00, outstanding balance ₦40,000.00, active status, and the selected UAT bank account. The repayment row correctly links to worker payment `f654a6ec-e2d4-42ae-8852-ae05070bac97` for ₦20,000.00.

**Additional confirmed defect:** The repayment-generated worker payment is stored with `type: salary` and all payroll breakdown fields, including `net_pay`, equal to zero. It should either use a dedicated `loan_repayment` type or an explicitly documented salary/repayment classification and must not present zero payroll figures in payslip/worker-payment reporting. The source RPC should populate or intentionally separate these fields.

## VAT entry setup — 2026-08-15

The VAT Schedule form exposes date, client/TIN, gross amount, output/input VAT, WHT, VAT withheld/paid, penalty, interest, brought-forward, LRP, state/local government, note, source record type/ID, and Free Trade Zone controls. `Invoice` is available and selected as the source type. A first authenticated query using `invoice_number` failed because the live `invoices` table uses a different identifier column; the actual invoice UUID must be retrieved using the current schema before saving the VAT record.

## VAT source invoice lookup resolved — 2026-08-15

The live invoice lookup resolved using `document_number`: UAT invoice UUID `96e50307-72f9-4f79-abee-d6129f272caf`, client UUID `b42c4979-62ce-4ee2-b181-c6a141868ccf`, amount_paid ₦205,518.79, balance_due ₦0.00, net_amount ₦205,518.79, tax_amount ₦16,518.79, and total_amount ₦205,518.79. The invoice table uses `tax_amount`, not `vat_amount`; the VAT entry will use the confirmed invoice UUID as source record ID.

## VAT calculation and state selector — 2026-08-15

With gross ₦205,518.79, output VAT ₦16,518.79, input VAT ₦0, WHT ₦4,110.38, VAT withheld ₦0, and VAT paid ₦0, the live form calculates Net amount ₦205,518.79, VAT payable ₦16,518.79, VAT credit ₦0, and Total ₦16,518.79. This calculation is internally consistent with the visible form formula. The state selector interaction is unreliable in the automation surface: targeting the Lagos option by its reported index committed `Bauchi`, and subsequent DOM/keyboard attempts did not change it. This will be recorded as a UI-selection risk unless the persisted record proves the state mismatch is only an automation indexing artifact.

## UAT VAT schedule entry — 2026-08-15

**Result:** PASS for VAT entry creation and formula display. The populated invoice-linked VAT record saved successfully; the live DOM reported `VAT schedule entry saved` and the modal closed. The controlled formula showed net amount ₦205,518.79, VAT payable ₦16,518.79, VAT credit ₦0, and total ₦16,518.79. The form persisted a state label that drifted during option interaction (`Bauchi` then `Cross River` rather than the intended Lagos), so the saved row must be checked for state integrity; this may be an automation selector indexing artifact but remains an explicit UAT concern.

## Persisted VAT row — 2026-08-15

The HR VAT Schedule list now shows one persisted row for `UAT - NIFHDPE QA 2026-08-15`, dated 2026-08-15, state `Cross River`, amount ₦16,518.79. The amount and VAT formula are correct, and the source-linked form save succeeded. The state value is a confirmed data-integrity concern: the intended Lagos selection ended up persisted as Cross River, so the state selector or indexed interaction logic requires a repository-level verification/fix rather than being treated as a mere display artifact.

## Finance Bank Analysis after HR workflows — 2026-08-15

Finance now shows 2 recent payments tracked and Net Cash Position ₦-53,481.21, independently equal to received ₦205,518.79 minus salary payment ₦239,000.00 minus loan-repayment payment ₦20,000.00. Bank Analysis continues to show 1 reviewed bank line, 1 linked line, and 0 awaiting ERP connection; the existing link is correctly tied to UAT invoice UUID `96e50307-72f9-4f79-abee-d6129f272caf` for ₦205,518.79. The VAT entry, salary payment, and loan repayment are not yet linked to bank lines, which is expected because only one synthetic bank line was imported, but the linkable-source selector should be checked for all entity types.

## Bank Analysis entity-type inventory — 2026-08-15

The live Link bank transaction dialog exposes 13 ERP entity types: Invoice, Receipt, Expense, Worker payment, Purchase order, Fuel log, Director account, Staff loan, Loan repayment, Salary schedule, Overtime, VAT entry, and External loan. This satisfies the intended broad entity-type surface at the UI level. The current UAT bank line is already linked, so no second live link mutation is needed; source-specific record availability and amount validation should be tested with non-mutating selection checks or repository inspection.

## Bank Analysis source-table verification — 2026-08-15

Authenticated REST checks returned HTTP 200/206 for all 13 configured source tables. Current row availability is: invoice 1, receipt 1, expense 0, worker payment 2, purchase order 1, fuel log 0, director account 0, staff loan 1, loan repayment 1, salary schedule 1, overtime 0, VAT entry 1, external loan 0. This confirms the live connector tables are reachable and the UAT rows are available to the central link-source layer; empty families remain untested by record mutation because no synthetic source is required for the current UAT evidence.

## Leave request workflow — 2026-08-15

A one-day UAT Annual Leave request for Ola (2026-08-20 to 2026-08-20, reason `UAT leave request QA; void after approval audit test.`) submitted successfully. The HR overview immediately propagated the request to `1 pending leave requests`, and the Leaves tab displayed the record with `HR: pending · MD: pending`.

**FAIL:** Clicking Review produced the live notification `Error record "new" has no field "updated_at"`. The HR review/decision workflow is therefore blocked by a production schema/RPC mismatch before HR review can complete. The exact error is evidence of a trigger or RPC writing/selecting an `updated_at` field that is absent from the live leave-request record schema.

## Disciplinary workflow — 2026-08-15

A controlled UAT disciplinary record for Ola was created with severity Warning, description `UAT disciplinary workflow verification only; no real incident.`, and action `UAT record; void after workflow test.`. The record persisted and displayed `HR: reviewed · MD: pending`. Clicking Approve succeeded and the card updated to `HR: reviewed · MD: approved`, with the notification `Disciplinary record approved`. The full HR-review-to-MD-decision path passed for this controlled record. Deletion remains available for UAT cleanup.

The approved UAT disciplinary record was deleted through the confirmed-delete dialog and the page returned to `No disciplinary records`, with notification `Record deleted`. Cleanup passed.

## Analytics live-data and date filter — 2026-08-15

Analytics loaded with live UAT data: Billed ₦205,518.79 from 1 invoice, Collected ₦205,518.79 with all invoices settled, Net Profit ₦-53,481.21 after ₦259,000.00 expenses/payments, and Inventory Value ₦120,000.00 across 1 item. With From and To both set to 2026-08-15, the page retained the same KPI values and rendered the Cash Flow chart with billed and collected bars at ₦205,518.79 for 2026-08; the Monthly Revenue vs Expenses chart rendered the live period bar and Inventory by Pipe Size showed Other 100%. The quotation conversion chart rendered sent/accepted series, while Top Clients correctly reported no accepted quotations. This is a PASS for live KPI/chart propagation and same-day date filtering; the `0 accepted quotes` state is consistent with the UAT quotation remaining sent.

## Expense logging workflow — 2026-08-15

A controlled Finance expense was saved successfully on 2026-08-15: category labor, description `UAT expense workflow test labor`, amount ₦1,000, folio `UAT-EXP-20260815`, site `UAT QA site`, VAT/WHT/part payment zero. The UI returned `Expense logged`; the overview remained stable and the expense is now available for tab and connector propagation checks.

The Expenses tab immediately rendered the UAT row: 2026-08-15, Labor, `UAT expense workflow test labor`, ₦1,000.00, Bank link `Unlinked`. Expense persistence and register propagation pass.

## Expense to Bank Analysis propagation — 2026-08-15

In the live Link bank transaction dialog, selecting ERP type `Expense` exposed exactly `2026-08-15 · labor · UAT expense workflow test labor`; selecting that source auto-filled the linked amount as ₦1,000. This confirms source propagation and amount mapping. No bank link was saved because the only reviewed bank line is already linked to the invoice, avoiding an invalid duplicate relationship.

## HR attendance check-in — 2026-08-15

The authenticated Ola session clicked Check In. After the loading state completed, the page still displayed `Not checked in`, `Checked In 0`, `Completed 0`, `Total Today 0`, and `No check-ins for this date yet`; no success toast or browser-console error appeared. **FAIL / silent no-op:** the attendance action did not produce a visible or persisted check-in in the live UI. Exact backend response requires direct network/REST inspection; this is a separate production workflow issue from the leave schema defect.

## HR subtab coverage — 2026-08-15

Read-only live coverage completed for Payroll, ID Cards, Performance, Recruitment, Training, Skills, Promotions, Loans, HMO, Accounts, and VAT Schedule. Payroll rendered 2 payments totaling ₦259,000 (salary ₦239,000 plus loan repayment ₦20,000); ID Cards listed DMX, Oluwakemi Hassan, and Ola with Generate ID actions; Performance, Recruitment, Training, Skills, Promotions, and HMO rendered correct empty states with their Add/Log controls; Loans showed Ola's active balance ₦40,000 and Repay action; Accounts showed `UAT QA Bank Account 2026-08-15` in NGN; VAT Schedule showed the saved UAT entry for Cross River at ₦16,518.79. A transient `Timeout expired` notification appeared during the first Payroll transition but the settled tab rendered normally. The attendance Check In action remains a separate silent no-op failure recorded above.

## Role and policy coverage — 2026-08-15

Settings Team showed `1 active team members · 0 pending role requests`, with only Oluwakemi Hassan visible and role HR; the authenticated Ola Administrator account is not listed as a switchable secondary session. Settings Policy rendered the management-approved configuration surface with keys for working days, tax, WHT, warranty, credit limit, and payment terms, but no values are configured. **Blocked:** complete role-based access testing for every role cannot be executed because no credentials or switchable sessions for the other configured roles were provided, and changing the only visible HR member's role would mutate live authorization. The evidence supports a controlled admin-session pass only, not a security sign-off for all roles.

## Populated Document Registry — 2026-08-15

The live Document Registry now shows 9 numbered documents: PO, quotation, invoice, proforma invoice, receipt, waybill, GRN, and two worker payments. The waybill is visible with status `Reprinted` and an available Reprint action. The registry still shows `Some document sources could not be loaded (revisions)` and `0 revisions`; this remains a confirmed production-visible source/schema failure. It also exposes WORKER_PAYMENTS/2026/0002 as detail `salary` despite being a loan repayment, corroborating the worker-payment type defect.

## Proforma-to-invoice financial mapping evidence — 2026-08-15

Live REST comparison: quotation `profit_margin_percent=15`, subtotal ₦120,000, transport ₦50,000, total ₦236,768.75; proforma preserved total ₦236,768.75 with taxable amount ₦189,000 and tax ₦16,518.75; converted invoice preserved the same line/discount/overhead/transport fields but stored total ₦205,518.79 and tax ₦16,518.79. The invoice item remained 10 × ₦12,000, proving the conversion path omitted the quotation/proforma profit margin rather than a rounding-only discrepancy.

## Phase 4 repository repair evidence — 2026-08-15

Confirmed fixes implemented on `feat/invoice-waybill-reactive-workflows`: Pipe Calculator now rejects non-positive length/flow with an inline error; Procurement's PO-card Receive GRN action opens the correctly populated GRN workflow and the Goods Received register now queries/render records and invalidates after posting; Finance payment completion refreshes invoices, receipts, and period-report caches; Document Registry revision loading no longer depends on a fragile nested profile relationship; a repair migration adds the missing `document_revisions` table/RLS/grants, maps salary and overtime breakdowns into worker_payments, introduces a distinct `loan_repayment` payment type, and records loan repayments with that type; proforma conversion carries a computed proforma-authoritative profit adjustment in invoice overhead and source metadata so the converted invoice total matches the accepted proforma.

Local validation: `pnpm exec tsc -p tsconfig.app.json --noEmit` passed; `pnpm test -- --run` passed with 26 tests; `pnpm lint` passed; `pnpm build` passed. Live retest remains blocked until the migration is applied and the partner-owned Vercel deployment publishes the branch.

## Phase 5 live retest constraint — 2026-08-15

The PR preview deployment is ready in Vercel but redirects to Vercel authentication because the project is protected under the partner-owned Vercel team. No partner account login was attempted. The public production deployment remains accessible and was tested as a deployment-state control: Pipe Calculator accepted length `0` and flow `0`, then displayed `0.00 m/s`, `0.00 m`, and `0 kg` without validation. This proves the repair branch is not yet the production deployment; the corrected behavior cannot be credited as live until the PR is merged or the partner provides an authorized preview bypass URL.
