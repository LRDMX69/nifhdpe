# Post-migration live QA rerun evidence — 16 August 2026

**Target:** https://nifhdpe.vercel.app  
**Repository head at rerun start:** `0a96a80 add final production certification report`  
**Execution:** authenticated production browser session, maintenance-admin account, clearly labelled historical UAT data only.

## Migration baseline

The repository contains the two user-reported migration files: `20260816090000_exclude_cancelled_invoices_from_finance_reports.sql` and `20260816093000_messages_delete_policy.sql`. The user confirmed both migrations were applied before this rerun. The live Finance and Messages checks below are the direct production verification; the application does not expose migration metadata to the browser.

## Finance post-migration retest — PASS

URL: https://nifhdpe.vercel.app/finance?tab=invoices&qa=post-migration-rerun-finance

The live settled Finance route displayed Total Revenue **₦205,518.79**, Total Received **₦205,518.79**, Receivables **₦0.00**, and Net Cash Position **₦-64,481.21**. The cancelled QA invoice `INVOICES/2026/0001B` remained visible and truthfully labelled `cancelled`, with gross/net ₦1,075.00, balance ₦1,075.00, paid ₦0.00, and bank status Unlinked. The legitimate `INVOICES/2026/0001` remained `paid`, linked, gross/net ₦205,518.79, paid ₦205,518.79, and balance ₦0.00. This confirms cancelled invoices are excluded from the live finance aggregates while the valid paid invoice remains intact.

## Messages post-migration deletion retest — PASS

URL: https://nifhdpe.vercel.app/messages?qa=post-migration-rerun-messages

The exact controlled audit message `QA MESSAGE — production audit 2026-08-16 09:41. Delete this exact message after verifying the thread.` was present in the Oluwakemi Hassan direct thread. Its sender-side action menu exposed Delete. After explicit user confirmation, Delete displayed a `Message deleted` success toast and removed the message from the open thread. A fresh navigation to `https://nifhdpe.vercel.app/messages?qa=post-migration-rerun-messages-reload` showed **1 message in scope · 0 unread**, with only the remaining `Hey` message visible; the controlled audit text was absent from both the conversation preview and the persisted thread. This confirms the DELETE RLS migration, zero-row guard, cache invalidation, and persistence behavior are now working in production.

## Initial rerun conclusion

The two previously blocked migration gates now pass in the live browser. The remaining rerun lanes are broad route/workflow regression, role and permission verification, responsive coverage, PDF/calculation rechecks, and detection/fix of any newly reproduced defects.

## Document Registry and notifications rerun — PASS

URL: https://nifhdpe.vercel.app/documents?qa=post-migration-rerun-documents

The live Document Registry settled cleanly and displayed **12 numbered documents on file** and **12 revisions**, with a clear loading-aware summary. Counts were Invoice 2, Proforma Invoice 1, Quotation 1, Receipt 1, Delivery 0, Waybill 1, Purchase Order 2, Goods Received 1, HSE Incident 0, Material Req. 0, Worker Claim 0, and Worker Payment 3. The records included both invoices, the accepted proforma, quotation, receipt, reprinted waybill, two POs, GRN, and salary/loan worker payments. The waybill row retained Reprint and Reprinted status. Revision history retained current/superseded invoice and PO snapshots with Ola and timestamps.

The global notification panel opened successfully from the registry and displayed `All caught up!`, consistent with Messages showing 0 unread after the controlled audit message was deleted. This retest did not create or alter any business record.

## Commercial and procurement route rerun — PASS for settled existing records

Quotations URL: https://nifhdpe.vercel.app/quotations?qa=post-migration-rerun-commercial

The route settled with 1 awaiting client and 0 accepted of 1 quotation, showing `QUOTATIONS/2026/0001` for the UAT client at ₦236,768.75 with Sent status. The accepted `PROFORMA_INVOICES/2026/0001` remained linked to a final invoice, with accepted status, issued 2026-08-15, valid until 2026-09-15, and the Open invoice action. The page retained Export CSV, Proforma, New Quotation, catalogue, search, refresh, and row-action surfaces. Its lifecycle guidance still states atomic/idempotent acceptance and controlled sales-order handoff. No duplicate conversion was submitted.

Procurement URL: https://nifhdpe.vercel.app/procurement?qa=post-migration-rerun-procurement

The route settled with 1 vendor, 2 open purchase orders, and 0 pending requisitions. The UAT Supplier HDPE 2026-08-15 vendor remained active with UAT-only contact/location data. Vendors, Purchase Orders, Goods Received, and Requisitions tabs all rendered. No source-error, blank-shell, or false-zero loading state was observed on this settled route. The existing purchase-order/GRN action retest continues in the next interaction step.

## Procurement GRN rerun — PASS

URL: https://nifhdpe.vercel.app/procurement?qa=post-migration-rerun-procurement

Purchase Orders showed draft `PURCHASE_ORDERS/2026/0002` at ₦30,000 with PDF and Receive GRN, and received `PURCHASE_ORDERS/2026/0001` at ₦120,000 with PDF. Clicking the draft PO Receive GRN action opened the repaired `Receive Goods via PO` dialog from the active Purchase Orders tab. It contained the pending PO selector, outstanding line `UAT HDPE Direct GRN Test Pipe · 2 outstanding`, accepted quantity 2, rejected quantity 0, optional lot/batch field, Receive GRN, and Close. The dialog was not submitted, so no duplicate stock or GRN was created.

## Inventory rerun — PASS

URL: https://nifhdpe.vercel.app/inventory?qa=post-migration-rerun-inventory

Inventory settled with 1 SKU tracked, 1 below minimum, and Total Value ₦120,000.00. `UAT HDPE Pipe 110mm SDR11` remained at quantity 8, minimum 10, and unit cost ₦15,000.00, independently reconciling 8 × ₦15,000 = ₦120,000 and correctly surfacing low-stock risk. Export CSV, Location, Box, Add Item, search/filter, AI prompt, and row controls rendered. The edit form exposed name, type, diameter 110, quantity 8, minimum 10, unit cost 15000, supplier/phone, storage location, and storage box fields; Cancel closed it without changing the record.

## Logistics rerun — PASS for safeguards; positive delivery path remains data-blocked

URL: https://nifhdpe.vercel.app/logistics?qa=post-migration-rerun-logistics

Logistics settled with 0 in transit, 0 delivered, and 0 vehicles, showing a clear empty state rather than a false loading result. Deliveries, Fleet, and Fuel Log tabs, CSV, New Waybill, search/status filter, New Delivery, and Schedule delivery controls rendered. New Delivery opened a complete form with project, destination, state, site, latitude, longitude, fleet vehicle, driver, date, distance, cost, and mandatory Manual dispatch exception reason. The guidance requires standard dispatch to originate from a confirmed-order queue so reservations and order lineage remain intact. The form closed without submission. No confirmed sales order/project was available, so fresh invoice-to-delivery-to-waybill creation remains data-blocked rather than marked PASS.

## HR rerun — PASS for settled data; attendance positive path remains GPS-dependent

URL: https://nifhdpe.vercel.app/hr?qa=post-migration-rerun-hr

HR settled with 0 checked in today, 0 pending leave requests, Not checked in, and a clear no-check-ins attendance state. Request Leave, Check In, Open connected view, Refresh, date selection, Holidays Add, and all ten tabs (Attendance, Leaves, Payroll, ID Cards, Performance, Recruitment, Training, Skills, Disciplinary, Promotions) rendered. Payroll showed This Month Total ₦269,000, Payments This Month 3, All-Time Records 3, with salary ₦239,000 and loan repayments ₦20,000 and ₦10,000. This matches Finance and the Document Registry. No source-error or stale-zero failure appeared. Successful attendance check-in still requires live browser geolocation and was not forced.

## Pipe Calculator rerun — PASS

URL: https://nifhdpe.vercel.app/calculator?qa=post-migration-rerun-calculator

The live baseline used HDPE, 110mm, length 100m, and flow 5 L/s. It displayed Pressure Rating 16 bar, Flow Velocity 0.79 m/s, Head Loss 0.68 m, and Total Weight 314 kg, matching the previously independently calculated values (0.7859503363 m/s, 0.6751104566 m, and 314 kg). The HDPE specification table and selected row rendered correctly. No migration-related regression appeared.

## Dashboard and Analytics rerun — PASS for settled aggregates

Dashboard URL: https://nifhdpe.vercel.app/dashboard?qa=post-migration-rerun-dashboard

The live Executive Command Center settled with Net Cash ₦-64,481.21, Active Projects 0, Opportunities 643, Pending Claims 0, Equipment Requests 0, Unread Messages 0, and Total Expenses ₦1,000.00. Attendance remained Not checked in with Check In available. Role switcher entries for Administrator, Engineer, Technician, Warehouse, Finance, HR, Reception/Sales, Knowledge Manager, and three trainee aliases rendered. Critical Alerts reported all systems clear. The earlier loading-state expense discrepancy was not reproduced.

Analytics URL: https://nifhdpe.vercel.app/analytics?qa=post-migration-rerun-analytics

Analytics settled with 0 accepted quotes feeding pipeline, 1 inventory SKU, Billed ₦205,518.79 across 2 invoices issued, Collected ₦205,518.79 with all invoices settled, Net Profit ₦-64,481.21 after ₦270,000 expenses/payments, and Inventory Value ₦120,000.00. Cash-flow, monthly revenue/expenses, inventory-by-pipe-size, quotation-conversion, and top-client surfaces rendered. The cancelled ₦1,075 invoice is not included in billed/collected totals, consistent with Finance after migration. No stale-zero or blank-shell issue was observed.

## Opportunities rerun — PASS for settled data and filtering

URL: https://nifhdpe.vercel.app/opportunities?qa=post-migration-rerun-opportunities

After the initial skeleton settled, Opportunities displayed 643 live opportunities, top relevance 10, pipeline value ₦2,535,510,000,000.00, Active Bids 0, Won 0, and Total Tracked 643. Export CSV, Refresh, Print, Add, All/Identified/Bidding/Won/Lost tabs, and the AI intelligence panel rendered. The AI card’s `3 new opportunities identified` remained a scan delta, not the total tracked count. Opening Won displayed the explicit `No opportunities tracked yet` state while the global tracked KPI remained 643, confirming status filtering rather than a data-loss issue. Desktop cards stayed contained at the current viewport; authenticated mobile resize remains a separate limitation.

## Claims and HSE rerun — PASS for settled empty states

Claims URL: https://nifhdpe.vercel.app/claims?qa=post-migration-rerun-claims

Claims settled with 0 pending, 0 approved, and 0 flagged; Pending 0, Total Claims 0, and Approved Total ₦0.00. Inbox and My Submissions tabs rendered with an explicit Inbox is clear state. No false loading or source-error state appeared. New claim submission, proof attachment, duplicate blocking, review, and PDF paths remain unsubmitted in this rerun because no controlled claim record was available.

HSE URL: https://nifhdpe.vercel.app/hse?qa=post-migration-rerun-hse

HSE settled with 0 open incidents and 0 toolbox talks logged. Incidents and Toolbox Talks tabs and Report Incident rendered, with the explicit Safety record is clean state. No blank or infinite-loading behavior appeared. No incident/toolbox record was created during the rerun.

## Compliance and Equipment rerun — PASS for settled empty states

Compliance URL: https://nifhdpe.vercel.app/compliance?qa=post-migration-rerun-compliance

Compliance settled with 0 documents tracked, 0 expiring within 30 days, Valid 0, Pending 0, and Expired 0. Add Document and Upload first document rendered alongside clear expiry-tracking guidance and an explicit No compliance documents yet state. No blank or infinite-loading behavior appeared; no controlled document was uploaded.

Equipment URL: https://nifhdpe.vercel.app/equipment?qa=post-migration-rerun-equipment

Equipment settled with 0 in use, 0 available, and 0 pending requests; Total 0, In Use 0, Available 0, Maintenance 0. Add, CSV, PDF, workflow guidance, and No equipment in the registry state rendered. The current skeleton-like rows were still visible during the capture, so a longer settled-data check and actual asset/request workflows remain open rather than being marked full PASS.

## Projects and Field Reports rerun — PASS for route integrity; UAT content warning retained

Projects URL: https://nifhdpe.vercel.app/projects?qa=post-migration-rerun-projects

Projects settled with 0 active and 0 completed of 0 total. Export CSV, New Project, search, All Status, and Create First Project rendered with guidance explaining client/team/GPS/budget linkage to field reports, deliveries, requisitions, expenses, and P&L. No project was created during the rerun.

Field Reports URL: https://nifhdpe.vercel.app/field-reports?qa=post-migration-rerun-field-reports

Reports Inbox settled with 2 reports on file, 0 awaiting review, Reports Today 0, This Week 2, Active Crews 0, and Incidents 2. Both General Report records rendered with administrator attribution and 2026-05-29 content. The reports contain low-quality UAT-like text (`We were just chilling in the block`), which remains a data-hygiene warning, not a rendering failure. The route’s AI structuring/evidence guidance rendered; no new report or attachment was submitted.

## Clients and BOQ rerun — PASS for settled route states

Clients URL: https://nifhdpe.vercel.app/clients?qa=post-migration-rerun-clients

Clients settled with 1 client in directory: `UAT - NIFHDPE QA 2026-08-15`, UAT QA Contact, phone +2348000000000, invalid-test email, and an explicit `UAT QA - Do not use for production` marker. Add Client, search, CRM AI prompts, and client-master propagation guidance rendered. No client was created or edited.

BOQ URL: https://nifhdpe.vercel.app/boq?qa=post-migration-rerun-boq

BOQ settled with 0 BOQs and 0 approved, with New BOQ and a clear No BOQs yet state. The route did not blank or show an infinite-loading failure. No BOQ was created during the rerun; product-specification, calculation, quotation/project linkage, and PDF paths remain unexecuted because the live dataset contains no controlled BOQ.

## Settings rerun — PASS for configuration visibility

URL: https://nifhdpe.vercel.app/settings?qa=post-migration-rerun-settings

Settings settled with 1 active team member and 0 pending role requests. Organization, Team, Profile, Policy, and User Feedback tabs rendered. Organization showed NIF Technical Company Ltd, info@nifhdpe.com, +234 801 234 5678, the Lagos address, Save Changes, and Office Coordinates 6.5528 / 3.3878 with Use current location and Save coordinates. The coordinates are explicitly used for 1 km attendance geofencing. No settings were changed during the rerun.

## Responsive rerun — BLOCKED by authenticated browser capability

The authenticated production session reported innerWidth 1280, innerHeight 1100, document width 1280, body width 1280, devicePixelRatio 1. An attempted `window.resizeTo(390,844)` left the authenticated viewport unchanged at 1280×1100 with document/body width 1280. Therefore this session cannot certify genuine mobile/tablet behavior. The current rerun confirms desktop containment only; authenticated responsive testing remains blocked by the browser/session capability, not marked PASS by inference.

## Role rerun — Engineer and Technician PASS for navigation/dashboard behavior

URL: https://nifhdpe.vercel.app/dashboard?qa=post-migration-rerun-roles

The Administrator dashboard role switcher again exposed 11 supported entries. Engineer mode rendered the Engineering Overview, current approved leave attention item, no active projects, no AI validation alerts, and a sidebar limited to technical, HR/Claims, and workspace modules. Technician mode rendered the field responsibility banner, current approved leave attention item, Submit Report, no active assignments, and the same restricted technical/people/workspace navigation. This confirms migration changes did not disturb the two technical role dashboard variants. Real non-maintenance deep-link denial remains untestable under the privileged maintenance session.

## Role rerun — Warehouse and Finance PASS for dashboard/navigation behavior

Warehouse mode rendered Warehouse Overview with Total Items 1, Low Stock 1, and UAT HDPE Pipe 110mm SDR11 at 8 / 10. Its sidebar exposed Equipment, Inventory, Logistics, Procurement, HR, Claims, Messages, and Documents, excluding unrelated technical/commercial/finance administration modules.

Finance mode rendered Financial Overview with Recent Expenses ₦1,000.00 and Recent Payments ₦269,000.00, the UAT expense workflow record, and the role-specific responsibility banner. Its sidebar exposed BOQ, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents. The migration-corrected Finance totals were already verified directly on the Finance route; no role-switch regression was observed.

## Role rerun — HR and Reception/Sales PASS for dashboard/navigation behavior

HR mode rendered HR Dashboard with Checked In Today 0, Pending Leaves 0, current approved leave attention, and people-lifecycle responsibility copy. Its sidebar exposed HSE, BOQ, Quotations, Clients, Logistics, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents.

Reception/Sales mode rendered Sales & Reception with Total Clients 1, Recent Quotes 1, Opportunities em dash, current approved leave attention, and quotation `QUOTATIONS/2026/0001` at ₦236,768.75 with Sent status. Its sidebar exposed BOQ, Opportunities, Quotations, Clients, Analytics, HR, Claims, Messages, and Documents, excluding operational finance/procurement/logistics and technical execution modules.

## Role rerun — Knowledge Manager and SIWES trainee PASS for dashboard/navigation behavior

Knowledge Manager mode rendered the corrected Institutional Knowledge workspace with Knowledge articles 0, Training records 0, Registry/Training/Messages connected actions, current approved leave attention, and only HR, Messages, and Documents navigation.

The first trainee alias rendered Trainee Dept. Dashboard with Submit Reflection, My Reflections 0, Pipe Calculator practice, current approved leave attention, and an explicit No reflections submitted yet state. Its sidebar exposed no operational modules. The remaining IT student and NYSC aliases were previously tested on the same deployed build and remain covered by the role matrix; a full alias switch can be repeated if required after this rerun.

## Role rerun — IT student and NYSC trainee PASS for learning isolation

The IT-student trainee alias rendered distinct IT-placement responsibility copy while retaining Trainee Dept. Dashboard, Submit Reflection, My Reflections 0, Pipe Calculator practice, approved-leave attention, and no operational sidebar modules. The NYSC member alias rendered distinct NYSC-posting responsibility copy with the same learning-only dashboard and no operational navigation. This completes the post-migration rerun of all 11 role-switcher entries represented by the application, while real non-maintenance authorization remains limited by the privileged test credential.

## Finance Receipts and Payments rerun — PASS

Receipts URL: https://nifhdpe.vercel.app/finance?tab=receipts&qa=post-migration-rerun-receipts

Finance Receipts showed `RECEIPTS/2026/0001` for the UAT client, dated 2026-08-15, method bank_transfer, Amount Received ₦205,518.79, and Bank link `Linked via invoice`. Finance KPIs remained Revenue ₦205,518.79, Received ₦205,518.79, Receivables ₦0.00, Net Cash ₦-64,481.21.

Payments URL: https://nifhdpe.vercel.app/finance?tab=payments&qa=post-migration-rerun-payments

Finance Payments showed three rows with corrected Type labels: salary ₦239,000.00 for the salary schedule, loan repayment ₦20,000.00, and loan repayment ₦10,000.00 for the same staff loan. All three remained Unlinked in Bank Analysis, matching the current known UAT state. No type-mapping regression appeared.

## Bank Analysis rerun — PASS for current linked ecosystem state

URL: https://nifhdpe.vercel.app/finance?tab=bank-analysis&qa=post-migration-rerun-payments

Bank Analysis settled with Reviewed bank lines 1, Linked lines 1, and Awaiting ERP connection 0. The existing connection remained `2026-08-15 · UAT payment for INVOICES/2026/0001`, ERP type invoice, linked amount ₦205,518.79, with the invoice UUID and link timestamp. The central layer showed no reviewed bank lines awaiting connection. Link bank line remained available; no new link was saved to avoid false reconciliation data.

## Invoice PDF rerun — PASS

Finance invoice URL: https://nifhdpe.vercel.app/finance?tab=invoices&qa=post-migration-rerun-pdf

The fresh post-migration Finance invoice route retained Revenue ₦205,518.79, Received ₦205,518.79, Receivables ₦0.00, the cancelled/paid row distinction, revision-history controls, and Download PDF controls. Clicking the paid invoice Download PDF action created a new browser artifact `invoice-invoices_2026_0001-INVOICES_2026_0001 (6).pdf`, confirmed in Chrome download history from `https://nifhdpe.vercel.app`. This confirms the current production PDF generation path remains active after migrations.

## Fresh invoice PDF visual inspection — PASS for this artifact

Artifact: `/home/ubuntu/Downloads/invoice-invoices_2026_0001-INVOICES_2026_0001 (6).pdf`

The regenerated invoice is one A4 page with NIF branding, company contact header, faint FINAL watermark, line-item table, totals block, signature lines, finance-verification stamp, footer reference, and Page 1 of 1. It shows the tested line quantity 10 at ₦12,000, subtotal ₦120,000, discount ₦1,000, overhead/site cost ₦20,000, transportation ₦50,000, tax ₦16,518.79, gross/net ₦205,518.79, net due ₦205,518.79, and balance due ₦0.00. Text is legible and the artifact is proportionate; full PDF certification still depends on the other required document types and the previously observed receipt/page-fit warning.
