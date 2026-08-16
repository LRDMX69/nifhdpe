# Final live-production QA matrix — NIFHDPE ERP

**Target:** https://nifhdpe.vercel.app  
**Execution mode:** Real browser interaction against deployed production; every result requires direct evidence.  
**Status vocabulary:** 🟢 PASS · 🟡 PASS WITH WARNING · 🔴 FAIL · ⚫ BLOCKED / UNTESTED

## Execution rules

Each test follows the chain **open → interact → submit → verify visible result → verify persistence/propagation → test resulting state**. Source inspection may explain a result but does not count as execution evidence. Any unavailable credential, role, configuration, or external dependency is recorded as ⚫ BLOCKED / UNTESTED with the exact reason.

## Route and page matrix

| ID | Area | Route | Required checks | Result | Evidence | Issue | Fix | Retest |
|---|---|---|---|---|---|---|---|---|
| P01 | Dashboard | `/dashboard` | Load, KPIs, charts, alerts, links, desktop/mobile, empty/loading/error states | PENDING | | | | |
| P02 | Quotations | `/quotations` | Create, edit, save, finalize, calculations, PDF, attachments/export, proforma conversion | PENDING | | | | |
| P03 | Clients | `/clients` | Create/edit, search/filter, propagation to dependent modules, desktop/mobile | PENDING | | | | |
| P04 | Inventory | `/inventory` | Stock records, purchase/usage/movement, units, balances, filters, propagation | PENDING | | | | |
| P05 | Projects | `/projects` | Create/edit, assignments, budget, client linkage, status, propagation | PENDING | | | | |
| P06 | Logistics | `/logistics` | Delivery/waybill creation, invoice inheritance, operational edits, PDF, document registry | PENDING | | | | |
| P07 | Field Reports | `/field-reports` | Create/edit/submit/review, attachments, geolocation, project linkage, permissions | PENDING | | | | |
| P08 | Finance | `/finance` | Overview, invoices, receipts, expenses, payments, bank analysis, charts, actions | PENDING | | | | |
| P09 | Equipment | `/equipment` | Records, allocation, usage, maintenance, actions, PDF, responsive layout | PENDING | | | | |
| P10 | Compliance | `/compliance` | Load, forms, checklists, status, permissions, empty/error states | PENDING | | | | |
| P11 | Opportunities | `/opportunities` | Create/edit/search/filter/status, mobile containment, conversion links | PENDING | | | | |
| P12 | Analytics | `/analytics` | Charts match records, update after transactions, filters, no hardcoded values | PENDING | | | | |
| P13 | HR | `/hr` | Employees, attendance, leave, HMO, schedules, payroll, loans, overtime, connected oversight, permissions | PENDING | | | | |
| P14 | Pipe Calculator | `/calculator` | Zero/small/large/decimal/edge validation, independently verified calculations | PENDING | | | | |
| P15 | Worker Claims | `/claims` | Create/edit/submit/review, categories, amounts, attachments, PDF, permissions | PENDING | | | | |
| P16 | Messages | `/messages` | Load, search/thread/send if permitted, empty/error states, permissions | PENDING | | | | |
| P17 | Procurement | `/procurement` | Vendors, local/imported purchases, POs, approvals, payments, stock/finance impact, PDF | PENDING | | | | |
| P18 | HSE | `/hse` | Create/submit/review, risk fields, project linkage, permissions, responsive layout | PENDING | | | | |
| P19 | Documents | `/documents` | Registry, generated documents, revisions, printed status, reprint, search/filter | PENDING | | | | |
| P20 | BOQ | `/boq` | Create/edit, product specifications, calculations, quotation/project linkage, PDF | PENDING | | | | |
| P21 | Settings | `/settings` | Organization, office GPS, banks, roles, permissions, configuration, error states | PENDING | | | | |

## End-to-end business workflow matrix

| ID | Workflow | Required propagation chain | Result | Evidence | Issue | Fix | Retest |
|---|---|---|---|---|---|---|---|
| W01 | Commercial lifecycle | Client → quotation → proforma → acceptance → final invoice → payment → balance → bank/finance/analytics | PENDING | | | | |
| W02 | Invoice lifecycle | Numbering → client/TIN/dates → lines → taxes/discount/logistics → totals → status/balance → PDF → revisions | PENDING | | | | |
| W03 | Waybill lifecycle | Invoice → waybill → inherited client/items/quantities → operational edits → PDF → document registry/reprint | PENDING | | | | |
| W04 | Client propagation | Create/edit client → quotations, proformas, invoices, sales orders, projects, payments, opportunities, reports, finance, analytics | PENDING | | | | |
| W05 | Finance transactions | Expense/payment/receipt → source account → balances → bank analysis → dashboard/reports/analytics | PENDING | | | | |
| W06 | Bank ecosystem | Bank transaction ↔ income, invoice, payment, expense, payroll, loans, procurement, claims, petty cash, transfers | PENDING | | | | |
| W07 | Procurement-to-stock | Vendor/PO/purchase → payment/expense → inventory receipt → stock balance → project/client usage → remaining stock | PENDING | | | | |
| W08 | Payroll | Salary schedule → deductions/loan/overtime/absence → approval → payment → payslip → finance/bank | PENDING | | | | |
| W09 | Staff loan | Loan creation → schedule → repayment → balance → completion → payroll and finance connection | PENDING | | | | |
| W10 | Overtime | Employee/month/days/rate → gross/overtime earnings → bank/account → payroll/finance | PENDING | | | | |
| W11 | VAT | Entry fields → output/input/WHT/net → state/LGA/FTZ → paid/payable/credit/penalty/interest/LRP → total | PENDING | | | | |
| W12 | HR approvals | Leave/disciplinary/attendance/employee records → HR visibility → MD approval → downstream schedule/payroll | PENDING | | | | |

## Document and version-history matrix

| ID | Document/record | Required checks | Result | Evidence | Issue | Fix | Retest |
|---|---|---|---|---|---|---|---|
| D01 | Quotation PDF | Logo/company/TIN/client/dates/number/calculations/signature/page breaks/tables/attachments | PENDING | | | | |
| D02 | Proforma PDF | Distinct proforma status/lifecycle, linked quotation, no premature final invoice semantics | PENDING | | | | |
| D03 | Invoice PDF | A4/A5 sizing by content, typography, totals, NGN, signatures, accounts, attachments, pagination | PENDING | | | | |
| D04 | Waybill PDF | Serial/description/unit/quantity/delivery person/client/invoice, document registry, reprint | PENDING | | | | |
| D05 | Payment receipt PDF | Receipt number, payer/client, invoice linkage, amount, bank/account, status, signatures | PENDING | | | | |
| D06 | Purchase order PDF | Vendor, PO number, quantities, prices, totals, approval/status | PENDING | | | | |
| D07 | Claims PDF | Claim details, amount, status, signatures, attachment handling | PENDING | | | | |
| D08 | Equipment/report PDFs | Complete data, layout, page breaks, signature/stamp where applicable | PENDING | | | | |
| D09 | Invoice revision | Finalized record edit → immutable original/version → audit who/when/old/new values | PENDING | | | | |
| D10 | Quotation/PO/expense/payment revisions | Same non-destructive history and audit requirements | PENDING | | | | |

## Calculation and data-integrity matrix

| ID | Calculation/integrity area | Required independent checks | Result | Evidence | Issue | Fix | Retest |
|---|---|---|---|---|---|---|---|
| C01 | Invoice totals | zero, small, large, decimal, VAT, WHT, discount, overhead, transport, subtotal, net, balance | PENDING | | | | |
| C02 | VAT | output/input/withholding/net/credit/payable/penalty/interest/brought-forward/LRP/FTZ | PENDING | | | | |
| C03 | Payroll | gross, pension, voluntary contribution, PAYE/tax, loan, absenteeism, suspension, deductions | PENDING | | | | |
| C04 | Overtime | days × daily rate, overtime days/earnings, payroll relationship | PENDING | | | | |
| C05 | Loans | principal, schedule, repayments, balance, zero completion, additional loan | PENDING | | | | |
| C06 | Inventory | purchase, receipt, usage, movement, units, remaining stock, financial implication | PENDING | | | | |
| C07 | Forex/bank | conversion, bank balances, transfers, linked movements | PENDING | | | | |
| C08 | Dashboard/analytics | charts/tables equal source records and update after transactions | PENDING | | | | |
| C09 | Data integrity | duplicates, orphans, stale cache, race/double submit, foreign keys, status transitions | PENDING | | | | |

## Role and permission matrix

| ID | Role | See | Create/edit | Approve | Must not access | Result | Evidence | Issue | Fix | Retest |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 | Administrator | All authorized modules | All permitted | All permitted | None outside policy | PENDING | | | | |
| R02 | HR | HR plus agreed clients/quotations/logistics/finance oversight | HR and agreed operational records | HR/leave as assigned | Unassigned admin controls | PENDING | | | | |
| R03 | MD/approver | Approval queues and oversight | As assigned | MD approvals | Operational editing outside scope | PENDING | | | | |
| R04 | Finance | Finance/procurement/claims as assigned | Financial records | Financial approvals as assigned | HR/admin controls outside scope | PENDING | | | | |
| R05 | Engineer/technician | Projects/reports/HSE as assigned | Field/project records | No unassigned approvals | Finance/admin/HR sensitive data | PENDING | | | | |
| R06 | Warehouse | Inventory/equipment/logistics as assigned | Stock/dispatch records | No unassigned approvals | Payroll/HR sensitive data | PENDING | | | | |
| R07 | Reception/sales | Opportunities/quotations/clients | Commercial records | No unassigned approvals | Payroll/bank/admin controls | PENDING | | | | |
| R08 | Unauthorized action tests | Deliberate blocked create/edit/approve/navigation actions | Must fail clearly and safely | N/A | Protected records | PENDING | | | | |

## UI, reliability, and failure matrix

| ID | Surface | Checks | Result | Evidence | Issue | Fix | Retest |
|---|---|---|---|---|---|---|---|
| U01 | Desktop | No overflow, usable tables/modals/dropdowns, icons/images, navigation | PENDING | | | | |
| U02 | Tablet | Same interaction and readable responsive layout | PENDING | | | | |
| U03 | Mobile | No horizontal overflow, cards/tables/modals/buttons accessible | PENDING | | | | |
| U04 | Loading/empty/error | Understandable states, no infinite loading, useful API errors | PENDING | | | | |
| U05 | Validation | Empty, invalid amount/date, duplicate, missing required fields | PENDING | | | | |
| U06 | Reliability | Network/API failure, duplicate submissions, stale cache, race conditions | PENDING | | | | |
| U07 | Repo hygiene | TODO/FIXME/MOCK/demo/placeholder/fake calculations/dead buttons/unfinished handlers/unused routes | PENDING | | | | |
| U08 | Console/API | No runtime errors, broken calls, 404s, broken assets during live use | PENDING | | | | |

## Final totals to calculate

| Metric | Value |
|---|---:|
| Total tests run | PENDING |
| Total passed | PENDING |
| Total failed | PENDING |
| Total fixed | PENDING |
| Total blocked/untested | PENDING |
| Production readiness score | PENDING |
| Final verdict | PENDING |

## Evidence convention

Every completed row must cite the exact production URL, action sequence, entered values, expected result, observed result, persistence/propagation verification, and any downloaded artifact or screenshot path. A blocked row must state the exact missing role, configuration, credential, external service, or business approval preventing execution.

## Live sweep evidence — first routes

### P01 Dashboard

**Observed:** `/dashboard` loaded in production with navigation, role switcher, KPI cards, charts, critical alerts, AI department intelligence, and Check In action. No blank screen was observed. The live page displayed `Opportunities 643`, `Total Expenses ₦0.00` in the KPI card while the page narrative displayed `Total Expenses ₦1,000.00`; this is a **data consistency issue to reproduce and fix**, not a pass. Attendance displayed `Not checked in` and Check In was present.

### P02 Quotations

**Observed:** `/quotations` loaded in production with one sent quotation and an accepted proforma linked to a final invoice. The page exposed Export CSV, Proforma, New Quotation, catalogue, search, and Open invoice controls. The visible lifecycle record was `QUOTATIONS/2026/0001` → `PROFORMA_INVOICES/2026/0001` → linked invoice, with an accepted status and amount `₦236,768.75`. Create/edit/finalize/PDF actions remain to be exercised in a controlled test record.

### P03 Clients

**Observed:** `/clients` loaded with one visible UAT client, Add Client, search, CRM AI panel, and no blank/loading failure. The visible client is explicitly marked `UAT QA - Do not use for production`, so it is suitable for test tracing but not production business data. Create/edit and downstream propagation remain to be exercised.

### P05 Projects

**Observed:** `/projects` loaded with a clear empty state, New Project and Create First Project actions, search, status filter, and explanatory workflow guidance. The page reported `0 active · 0 completed of 0 total`. No blank screen or dead empty state was observed. Project creation and downstream linkage remain to be exercised.

### P04 Inventory

**Observed:** `/inventory` loaded with one SKU (`UAT HDPE Pipe 110mm SDR11`), quantity 8, minimum 10, unit price `₦15,000`, total value `₦120,000`, and a visible low-stock count of 1. Search, type filter, Add Item, Location, Box, and item action controls were present. The displayed total value agrees with 8 × ₦15,000. Purchase/usage propagation remains to be exercised.

### P06 Logistics

**Observed:** `/logistics` loaded with Deliveries, Fleet, and Fuel Log tabs; New Waybill, New Delivery, Schedule delivery, search, and status filter controls; and a clear empty state reporting `0 in transit · 0 delivered · 0 vehicles`. The page explicitly describes dispatch, reserved stock, project lineage, and GPS completion. Actual invoice-to-waybill creation and document registry propagation remain to be exercised.

### P07 Field Reports

**Observed:** `/field-reports` loaded with two reports on file, zero awaiting review, report metrics, and two visible General Report records. The workflow guidance states technicians/engineers submit notes and photos and reports route for review. The visible records contain low-quality test-like prose (`We were just chilling in the block`), which should be treated as UAT/test data and reviewed for production data hygiene. Creation/edit/submission and attachment tests remain pending.

### P18 HSE

**Observed:** `/hse` loaded with Incidents and Toolbox Talks tabs, Report Incident action, and an explicit clean empty state showing `0 open incidents · 0 toolbox talks logged`. No blank or infinite-loading state was observed. Incident and toolbox-talk creation/review remain pending.

### P10 Compliance

**Observed:** `/compliance` loaded with Add Document, Upload first document, expiry summary cards, and a clear empty state showing zero tracked, valid, pending, and expired documents. No blank or infinite-loading behavior was observed. Actual upload/expiry tracking remains pending.

### P14 Pipe Calculator

**Observed:** `/calculator` loaded with HDPE and 110mm defaults, length `100`, flow `5`, Calculate action, and HDPE specification table. The valid baseline form rendered without runtime failure. The previously completed zero-input live retest remains recorded separately: zero values now show an explanatory validation error and do not display a false zero result. Additional independent calculations and edge values remain pending in this QA pass.

### P11 Opportunities

**Observed:** `/opportunities` loaded with zero live opportunities, pipeline value `₦0.00`, tabs for All/Identified/Bidding/Won/Lost, Export CSV, Refresh, Print, Add, and AI Intelligence content. The page rendered a skeleton-like empty area beneath the tabs while the markdown reported zero records; mobile containment still requires a dedicated viewport check. The AI text claims `3 new opportunities identified` while the live KPI says zero tracked; this requires reconciliation before accepting the dashboard as consistent.

### P12 Analytics

**Observed:** `/analytics` loaded with date filters, Billed `₦205,518.79`, Collected `₦205,518.79`, Net Profit `₦-64,481.21`, Inventory Value `₦120,000.00`, and charts for cash flow, revenue/expenses, inventory by pipe size, quotation conversion, and top clients. The charts rendered visibly. The page states `0 accepted quotes feeding pipeline` and `1 inventory SKUs in scope`; cross-checks against source tables and date-filter updates remain pending. The chart tooltip observed a zero billed/collected month while the aggregate totals were non-zero, which is expected only if the hovered month has no activity and must be checked against the selected range.

### P13 HR

**Observed:** `/hr` loaded with Request Leave, Check In, ten HR tabs, date selection, attendance metrics, a clear attendance empty state, holidays Add action, and the redesigned Connected operations entry point. The first-use view is readable and not an inline multi-panel cluster. Attendance remains untestable for actual check-in until office GPS coordinates are configured; this must be recorded as ⚫ BLOCKED / UNTESTED rather than PASS. Leave/payroll/loan/overtime/HMO and permission workflows remain to be exercised.

### P09 Equipment

**Observed:** `/equipment` loaded with Add, CSV, PDF, equipment metrics, and a clear empty state showing zero total/in-use/available/maintenance. No blank or infinite-loading state was observed. Asset creation, allocation, maintenance, request approval, and PDF generation remain pending.

### P17 Procurement

**Observed:** `/procurement` loaded with Vendors, Purchase Orders, Goods Received, and Requisitions tabs. It reported 1 vendor, 2 open POs, and zero pending requisitions. A UAT vendor was visible. Purchase Orders showed `PURCHASE_ORDERS/2026/0002` in draft for `₦30,000` with New PO, PDF, and Receive GRN actions, and `PURCHASE_ORDERS/2026/0001` received for `₦120,000` with PDF. The procurement lifecycle is visibly connected to GRN and inventory guidance. Actual creation/approval/payment/stock propagation remains pending.

### P15 Worker Claims

**Observed:** `/claims` loaded with Inbox and My Submissions tabs, zero pending/approved/flagged claims, and a clear Inbox is clear state. Claim creation/review, amount validation, attachments, and PDF generation remain pending.

### P16 Messages

**Observed:** `/messages` loaded with one in-scope message, zero unread, Search conversations, New Chat, Broadcast, and explanatory privacy/role guidance. A visible message from Oluwakemi Hassan rendered correctly. Sending/search/thread behavior and permissions remain pending.

### P19 Document Registry

**Observed:** `/documents` loaded with search, date filters, CSV export, tabs for every numbered document type, operational revision history, and a zero-state showing `0 numbered documents on file` and `0 revisions`. This is a serious propagation signal because Finance and Procurement visibly contain numbered UAT invoices/POs while the registry currently reports zero. The prior revision-history retest passed for a historical target, but this live state requires reconciliation and likely indicates stale/mismatched organization data or incomplete document registration.

### P20 BOQ

**Observed:** `/boq` loaded with New BOQ and a clear `0 BOQs · 0 approved` empty state. No blank or infinite-loading state was observed. BOQ creation and linkage to quotations/projects/product specifications remain pending.

### P21 Settings

**Observed:** `/settings` loaded with Organization, Team, Profile, Policy, and User Feedback tabs. Organization contains company details and an Office Coordinates section explicitly used for attendance geofencing. Production currently shows latitude `6.5528` and longitude `3.3878`, with Use current location and Save coordinates actions. This changes the earlier attendance assumption: the office GPS configuration is present, so attendance must be retested; any remaining disablement may be caused by browser geolocation permission or distance, not missing configuration.

**Console:** The normal live browser console showed no console output/errors during the route sweep at the time checked.

### Attendance retest after Settings verification

**Observed:** Settings exposes and displays office coordinates `6.5528, 3.3878`. On `/hr`, the Check In button is present and not disabled (`disabled: false` by live DOM inspection). Clicking it produced the explicit toast `Location required — Please enable GPS/location to check in.` The attendance counters remained zero and no check-in record appeared.

**Result:** ⚫ BLOCKED / UNTESTED for successful check-in, exact reason: the live browser session does not provide usable GPS/location permission or coordinates, despite office coordinates being configured. This is no longer correctly described as “no office GPS configured.” The user-facing error is understandable and no false attendance record was created. A real device/browser with location enabled and within the configured 1 km radius is required for the positive path.

### P08 Finance and W06 Bank Analysis

**Observed:** `/finance?tab=bank-analysis` loaded with real financial aggregates: Total Revenue `₦205,518.79`, Total Received `₦205,518.79`, Receivables `₦0.00`, Net Cash Position `₦-64,481.21`. Bank Analysis reported 1 reviewed bank line, 1 linked line, and 0 awaiting ERP connection. The existing connection was `UAT payment for INVOICES/2026/0001`, ERP type invoice, linked amount `₦205,518.79`. The Link bank line action opened a form with ERP record type, ERP record, approved bank transaction, linked amount, and audit note, plus explicit organization validation guidance. The unmatched-link path was not submitted because no approved unmatched line was available and creating a false reconciliation would corrupt test data.

### Finance transaction sub-tabs

**Receipts:** Finance Receipts showed `RECEIPTS/2026/0001` for the UAT client, bank transfer, `₦205,518.79`, but the row displayed **Unlinked** under Bank link even though Bank Analysis showed a linked bank line for the same UAT payment and amount. This is a reproducible propagation/data-consistency issue: receipt-level bank linkage and Bank Analysis linkage are not aligned.

**Payments:** Worker Payments showed three records for Ola: salary `₦239,000.00`, and two records described as staff loan repayment for the same loan at `₦20,000.00` and `₦10,000.00`. The visible Type badge rendered `Salary` for all three rows, even though the descriptions identify two loan repayments. This is a reproducible UI/type-mapping defect: worker payment types are not displayed correctly in the Finance register.

**Expenses:** Logged Expenses showed one UAT labor expense for `₦1,000.00`, with the row’s bank link Unlinked. Category, description, amount, and date rendered; source bank/account, supporting information, approval state, and audit details were not visible in the register and require form/detail testing.

### Document Registry settled retest

The first `/documents` capture was during the loading skeleton and temporarily showed zero. After reopening and allowing asynchronous queries to settle, production showed **11 numbered documents** and **10 operational revisions**. The registry reconciled to 1 invoice, 1 proforma, 1 quotation, 1 receipt, 1 waybill, 2 purchase orders, 1 GRN, and 3 worker payments. The revision table showed invoice and PO snapshots with current/superseded states and changed-by Ola metadata. This resolves the apparent zero-count issue as an asynchronous capture artifact, not a registry defect. The worker-payment type issue remains visible: all three registry rows show `salary`, matching the Finance register.

### D01 Quotation PDF

The live quotation PDF downloaded from `/quotations` successfully. `pdfinfo` reported **1 page, A4 (595.28 × 841.89 pts)**. Extracted text included company/document ID, client, site/reference, status, line-item quantity and price, NGN-safe headers, subtotal, labor, transport, profit, overhead/site cost, tax, and grand total. Visual inspection showed a professional branded header, dark blue table, green accent, draft watermark, totals box, signature lines, seal/background, and footer on one page. The document is usable for controlled UAT; the draft watermark/status is appropriate for the source record.

### D04 Waybill PDF and registry lifecycle

The Document Registry Waybill tab showed `WAYBILLS/2026/0001`, status Reprinted, and a Reprint action. Clicking Reprint produced the explicit confirmation `WAYBILLS/2026/0001 copy 3 was generated and recorded.` The downloaded PDF was **1 page, A4**, with document ID, date, driver, vehicle, destination, recipient, project, print history `copy 3`, notes, authorization text, inherited item description `UAT HDPE Pipe 110mm SDR11`, quantity 8, unit m, prepared/approved/date lines, and company seal. Visual inspection confirmed the table, seal, watermark, footer, and signatures stayed together on one page.

### D02 Invoice revision history merged retest

After PR #18 deployment, Finance → Invoices → `INVOICES/2026/0001` → Revision History now displays four operational snapshots instead of the previous empty state. The dialog shows v1 superseded, v2 superseded, v3 superseded, and v4 current, with snapshot reasons and timestamp metadata. The v2 entry shows the proforma-invoice link change; v4 shows status `unpaid` → `paid`, amount paid `0` → `205,518.79`, and balance due `205,518.79` → `0`. The central registry and record-level Finance history now agree.

### Finance integrity correction merged retest

After PR #19 deployment, `/finance?tab=receipts` shows `RECEIPTS/2026/0001` with bank status **Linked via invoice**, matching the authoritative linked invoice and amount. `/finance?tab=payments` shows the salary record as Salary and the two historical staff-loan rows as **loan repayment** for `₦20,000` and `₦10,000`. `/hr` → Payroll shows the same three records with Salary and Loan Repayment labels, total `₦269,000`, 3 payments this month, and 3 all-time records. `/documents` settles at 11 numbered documents and 10 revisions; its three Worker Payment rows show salary `₦239,000`, loan repayment `₦20,000`, and loan repayment `₦10,000`. The cross-module presentation and receipt-link propagation defect is resolved without rewriting historical UAT data.

### Settled Dashboard and Opportunities retest

The earlier Dashboard `Total Expenses ₦0.00` and Opportunities zero-card capture occurred during the initial loading skeleton. After the queries settled, Dashboard showed `Total Expenses ₦1,000.00`, matching Finance and the 30-day recent-outflow value. A live DOM inspection found one settled Total Expenses card at `₦1,000.00`; no duplicate metric remained. `/opportunities` settled at **643 live opportunities**, **₦2,535,510,000,000.00 pipeline value**, 0 active bids, 0 won, and 643 total tracked. The AI card’s `3 new opportunities identified` is a scan delta dated 19 June 2026, not a claim that only three opportunities exist, so the settled KPI is consistent. The provisional loading-state warnings for these two routes are closed.

### C01/CALC Pipe Calculator live validation

The settled production calculator case used HDPE, 110 mm, length 100 m, and flow 5 L/s. The live output was Pressure Rating `16 bar`, Flow Velocity `0.79 m/s`, Head Loss `0.68 m`, and Total Weight `314 kg`. An independent saved Python calculation using the implementation’s stated inner diameter (0.09 m), HDPE Hazen-Williams coefficient (150), and formulas produced velocity `0.785950 m/s`, head loss `0.675110 m`, and weight `314.00 kg`, matching the displayed rounded values. The earlier zero-input validation remains PASS with a clear error and no false result. Normal calculation integrity is PASS for this case; small/large/decimal edge cases remain pending.

### Calculator precision correction merged retest

After PR #20 deployment, the live calculator accepted HDPE 110 mm, length `0.01` m, flow `0.1` L/s and displayed **Total Weight `0.03 kg`**, resolving the prior misleading `0 kg` output. It continued to display finite velocity `0.02 m/s`, head loss `0.00 m`, and pressure `16 bar`. The normal 100 m / 5 L/s case remains independently verified at `0.79 m/s`, `0.68 m`, and `314 kg`.

### W07/D06 Procurement and Purchase Order PDF

Production Procurement → Purchase Orders showed `PURCHASE_ORDERS/2026/0001` as **received** from `UAT Supplier HDPE 2026-08-15`, value `₦120,000`, with PDF available; the source draft PO `PURCHASE_ORDERS/2026/0002` also exposed Receive GRN. The received PO PDF downloaded successfully as **1 page, A4 (595.28 × 841.89 pts)**. Text and visual inspection confirmed document ID, PO number, FINAL status, NGN currency, vendor, description, quantity 8, unit price `₦15,000`, total `₦120,000`, grand total, prepared/approved/date lines, administrative approval stamp, letterhead, watermark, and footer. The existing GRN/Inventory record reconciles to the same 8 units and `₦120,000` stock value.

### U07 Repository hygiene

The source and migration sweep returned **0 files** containing `TODO`, `FIXME`, `XXX`, or `HACK` markers, and no matches for `coming soon`, `not implemented`, `mock data`, `dummy data`, or `fake data`. Remaining `placeholder` and `No … yet` strings are form prompts or intentional empty-state guidance, not unfinished handlers. U07 is PASS for repository markers; UAT records and AI-generated historical content remain data-quality warnings rather than code placeholders.

### R01/R02/R05/R08 Role and permission evidence

The live role switcher rendered role-specific onboarding and navigation. HR’s scoped dashboard exposed HR, agreed Finance/Procurement/Analytics oversight, Quotations, Clients, Logistics, Claims, Messages, and Documents, consistent with the current organization policy that HR heads Finance. Technical Dept. exposed Projects, Equipment, Field Reports, HSE, Compliance, Calculator, HR, Claims, Messages, and Documents, while hiding Finance, Procurement, Analytics, Marketing Opportunities, and Settings from navigation. Technical onboarding clearly described engineering responsibilities.

A direct `/finance` deep-link attempt was also made after selecting Technical Dept. inside the SPA. The account is a maintenance administrator, and `ProtectedRoute` explicitly bypasses role denial for maintenance admins, so the page remained reachable. This proves the maintenance override works but does **not** prove a non-maintenance Technical user’s deep-link denial. A real non-maintenance role credential is required to complete R08 safely; no destructive or unauthorized mutation was attempted. Navigation-level role scoping is PASS; direct-denial test is BLOCKED/UNTESTED due credential scope.

### W02/C01 Invoice form first-use and validation evidence

Production `/finance?tab=invoices&new=1` opened the canonical `Create complete invoice` dialog. The form clearly exposes the required Client selector, invoice kind, sales-order lineage, client PO, project, linked delivery/waybill, customer reference, invoice/due dates, line-item description/quantity/unit/unit price/discount/cost code, site/delivery context, VAT and WHT rates, discount, overhead/site cost, transportation, currency, Free Trade Zone, receiving account, payment terms, terms, and notes. The initial zero-line state calculates all totals as `₦0.00` and presents `Create invoice atomically`; no record was submitted. This confirms first-use field completeness and preserves the safe no-submit state for the required-field validation test.

## Live evidence — invoice validation and cancellation hardening retest

### Finance invoice submission gate

**Production URL:** `https://nifhdpe.vercel.app/finance?tab=invoices`.

**Observed:** Opening **New Invoice** with no client, no description, and a zero subtotal left **Create invoice atomically** disabled. Selecting the existing UAT client, entering description `UAT validation line`, quantity `1`, and unit price `1000` produced a visible subtotal of `₦1,000.00`, VAT of `₦75.00`, and gross/net due of `₦1,075.00`; the submit control then became enabled. The valid-data enablement test was intended to stop before submission, but a moving browser index caused an accidental production draft creation.

### Accidental draft cleanup

**Record:** `INVOICES/2026/0001B`, UAT client, `₦1,075.00`, source `manual`, no payment, no delivery, no bank link.

**Observed and remediated:** The record was immediately changed from `draft` to `cancelled` through the authenticated production session after user confirmation. A live refresh showed the record as `cancelled`; the legitimate `INVOICES/2026/0001` remained `paid` and linked. No payment, waybill, or document-registry record was created for the accidental draft.

### Defect discovered during cleanup

**Issue:** The Finance report RPC treated every non-draft invoice as operational invoiced revenue and receivables, so the newly cancelled `₦1,075.00` draft temporarily changed live totals to `Total Revenue ₦206,593.79` and `Receivables ₦1,075.00` even though it was cancelled.

**Fix prepared:** Migration `20260816090000_exclude_cancelled_invoices_from_finance_reports.sql` changes revenue, invoice counts, ageing buckets, and monthly invoicing to exclude both `draft` and `cancelled` invoices. `src/pages/Finance.tsx` also adds a supported **Cancel draft** action with an audit-preserving confirmation and prevents cancelled invoices from offering payment recording.

**Retest status:** TypeScript compilation passed with `./node_modules/.bin/tsc --noEmit`. Production RPC retest remains blocked until the migration is applied to Supabase and the corresponding PR is deployed.

## Live evidence — Messages end-to-end audit

**Production URL:** `https://nifhdpe.vercel.app/messages`.

**Send and persistence:** Opened **New Chat**, selected `Oluwakemi Hassan (hr)`, entered the unique message `QA MESSAGE — production audit 2026-08-16 09:41. Delete this exact message after verifying the thread.`, and sent it. The UI displayed `Message sent`, navigated into the direct thread, and rendered the message with a timestamp. Returning to the Messages list showed `2 messages in scope` and the conversation preview contained the exact QA text. This confirms the compose, insert, thread navigation, list propagation, and persistence paths.

**Delete retest:** The sender-side action menu exposed **Delete** for the exact QA message. Selecting it did not remove the message, did not display an error toast, and returning to the list still showed the conversation and exact QA text. This is a live **FAIL**.

**Root cause:** The `messages` table had no DELETE RLS policy, and `ChatView` did not scope the delete mutation to organization/sender or surface mutation errors. The test QA message remains in production because the deployed policy correctly rejected the delete.

**Fix prepared:** Migration `20260816093000_messages_delete_policy.sql` adds sender-scoped DELETE authorization for direct/context messages, while retaining administrator/maintenance moderation capability. `src/components/messaging/ChatView.tsx` now constrains deletion by message ID, organization, sender, and message type and displays success/error feedback.

**Retest blocker:** The migration must be applied and the updated frontend deployed. After deployment, the exact QA message must be deleted and the list refreshed to confirm it is absent from both the thread and conversation preview. Until then, Messages deletion is not production-ready.

## Automated regression evidence — Messages hardening

**Repository:** `LRDMX69/nifhdpe`, commit `ab34720`.

`./node_modules/.bin/tsc --noEmit` passed after the Messages deletion and Dashboard unread-count changes. `./node_modules/.bin/vitest run --reporter=verbose` passed with **5 test files and 26 tests** passing, covering payroll, financial calculations, offline queue error classification, and print cleanup. The existing automated suite does not yet include a live Supabase RLS integration test for message deletion; that remains a deployment-gated live retest requirement.


## Live evidence — Dashboard/message consistency and CI gate

**Dashboard URL:** `https://nifhdpe.vercel.app/dashboard`.

The live Dashboard showed `Unread Messages 0` while the controlled QA message was authored by the current user, which is consistent with the direct-message unread rule. The Dashboard also showed `Total Expenses ₦1,000.00`, `Net Cash ₦-64,481.21`, and `Opportunities 643`; these values require source-record reconciliation in the broader analytics pass. The pre-fix Dashboard unread query counted all unread broadcasts and did not exclude self-authored direct messages. That implementation was corrected in commit `ab34720` to match the NotificationBell and Messages semantics.

**CI evidence:** The repository’s `.github/workflows/ci.yml` is present and runs `npm ci`, normal and strict TypeScript checks, lint, Vitest, production build, `npm audit --audit-level=high`, diff hygiene, and the production-marker audit on pushes, pull requests to `main`, and manual dispatch. The equivalent local npm gate passed: typecheck, strict typecheck, lint, 26 Vitest tests across 5 files, production build, and marker audit.


## Live evidence — Document Registry inconsistency

**Production URLs:** `https://nifhdpe.vercel.app/finance?tab=invoices` and `https://nifhdpe.vercel.app/documents`.

Finance visibly lists two numbered invoices, including `INVOICES/2026/0001B` (cancelled) and `INVOICES/2026/0001` (paid), while Document Registry initially reported `0 numbered documents on file` and `0 revisions`. Navigating back to `/documents` immediately afterward reproduced a blank white screen with no interactive elements. This is a new live **FAIL** requiring root-cause diagnosis. The evidence indicates either a registry source-query/rendering failure or a deployment/runtime exception; it must not be accepted as a valid empty registry while Finance contains numbered records.


**Reproduction update:** A second clean navigation to `/documents` again produced a blank white screen with no detected interactive elements. The failure is therefore reproducible, not merely a slow first load. The deployed bundle contains the Document Registry component, so the next diagnosis step is to capture runtime/network failure details or isolate a data-dependent render path; this route remains a production blocker.


**Runtime diagnosis:** On the blank page, the root element had zero HTML and the browser resource table showed the application JavaScript resources with zero transfer size, although independent HTTP checks returned 200 for the corresponding asset URLs. A cache-busting navigation to `/documents?qa=1765932440` reproduced the blank screen. The failure is therefore not resolved by cache busting; it remains a production runtime/deployment blocker requiring deployment-level investigation or a defensive route error boundary before GO.


**Boundary diagnosis:** The repository already wraps the application in `RootErrorBoundary`, whose fallback displays an actionable error and reload control. The live Document Registry remains completely blank with an empty `#root` and no boundary fallback, which strongly indicates the failure occurs before React mounts (asset/runtime/deployment loading) rather than as an ordinary component render exception. This needs partner-host deployment investigation; adding another page-level boundary would not explain the empty root.


**PWA retest:** The live site had an active service worker at `/sw.js` with scope `/` and no named Cache Storage entries. The QA browser unregistered it and reloaded the cache-busted Document Registry route; the blank screen persisted. This rules out the active service worker as the sole cause in this session. The route remains a live blocker despite the repository’s existing root error boundary.


**Session-wide blank-shell observation:** After unregistering the service worker, `/finance?tab=invoices` also rendered blank and remained blank after a reload shortcut. This indicates the QA browser session itself entered a failed asset/bootstrap state after the service-worker intervention; it does not prove Finance is independently broken in a fresh session. The earlier Document Registry blank was reproduced before this intervention and remains the primary route-specific failure evidence. A fresh browser context or partner-side deployment inspection is required for a clean retest.

## Source audit evidence — Field Reports

The Field Reports submission path required site photos but previously ignored storage-upload errors and photo-record insert errors during direct online submission, allowing a report to appear saved without its required evidence. Its list query also discarded database errors and returned an empty list. The path now throws and surfaces those failures, preserving the offline queue for retry and preventing silent loss of required attachments. TypeScript, strict typing, lint, and the 26-test suite pass after the change; a live photo-upload failure/retry retest remains scheduled for the live-fix phase.

## Source audit evidence — Logistics delivery completion

The Logistics `navigator.geolocation.getCurrentPosition` callbacks previously performed asynchronous linked-delivery RPCs and fallback updates outside the outer `try/catch`, so RPC, RLS, or update failures could become unhandled promise rejections with no operator feedback. Both GPS-success and GPS-failure callbacks now catch and toast delivery-update errors. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; the live linked-delivery completion and GPS denial paths remain scheduled for production retest.

## Source audit evidence — Context discussions

Embedded project, field-report, and claim discussions previously discarded read errors and had no send-error feedback, so permission or connectivity failures could look like empty discussions or no-op comments. Context reads now throw into the surrounding async boundary, and comment sends provide success/error feedback. TypeScript, strict typing, lint, and the 26-test suite pass after the change; live context-thread send/reload/error-path retesting remains deployment-gated.

## Source audit evidence — Finance source failures

Finance’s worker-payment, expense, invoice, receipt, and employee-member queries previously ignored Supabase errors and converted permission/schema/network failures into empty arrays. The queries now throw errors so the page’s existing async/error states can identify an unavailable source instead of presenting an inaccurate zero-data view. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live source-error and aggregate-reconciliation retesting remains deployment-gated.

## Source audit evidence — Procurement source failures

Procurement’s vendor, purchase-order, and material-requisition queries previously ignored Supabase errors and could render empty procurement lists during a permission, schema, or network failure. The queries now surface errors through the existing page error states. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live procurement-source and workflow retesting remains deployment-gated.

## Source audit evidence — Logistics source failures

Logistics’ project selector, vehicle list, and fuel-log queries previously discarded Supabase errors and could produce incomplete dispatch forms or misleading empty fleet records. Those queries now surface backend failures through the page’s error boundary. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live fleet and dispatch-source retesting remains deployment-gated.

## Source audit evidence — Inventory source failures

Inventory’s storage-location and storage-box queries previously ignored backend errors, which could leave warehouse selectors empty without explaining why. Both queries now surface source failures through the module’s existing error state. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live warehouse-source retesting remains deployment-gated.

## Source audit evidence — Equipment source failures

Equipment’s asset, project, staff-profile, and equipment-request queries previously ignored backend errors, allowing assignment and maintenance screens to show incomplete or empty data without explanation. The queries now surface source failures through the module’s existing error state. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live equipment-source and request workflow retesting remains deployment-gated.

## Source audit evidence — HSE source failures

HSE’s project selector, member selector, and toolbox-talk list previously ignored backend errors and could leave safety workflows with incomplete context or an unexplained empty register. Those queries now surface source failures through the module’s existing error state. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live HSE incident/toolbox workflow retesting remains deployment-gated.

## Source audit evidence — Worker Claims source failures

Worker Claims previously ignored errors while loading claims, claimant profiles, visible-member roles, and the 24-hour duplicate check. A failed duplicate lookup could allow a duplicate claim through, while failed inbox sources could appear empty. All four paths now surface errors and block the protected operation when the source is unavailable. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live claims submission, duplicate blocking, attachment persistence, and permission retesting remain deployment-gated.

## Source audit evidence — Projects source failures

Projects’ main project list, client selector, and member selector previously ignored backend errors, which could disconnect project execution from clients, teams, or commercial data while presenting an apparently valid empty state. The queries now surface source failures through the existing project error boundary. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live project-to-sales-order and team-assignment retesting remains deployment-gated.

## Source audit evidence — HR source failures

HR’s payroll-profile RPC, attendance views, membership list, organization branding, leave, performance, recruitment, training, skills, disciplinary, promotion, and salary-payment queries previously ignored backend errors and could render partial HR data as if it were complete. These sources now throw into their existing error states, preventing silent partial views. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live HR source, payroll, attendance, and workflow retesting remains deployment-gated.

## Source audit evidence — Analytics source and accounting fallback

Analytics’ payments, expenses, quotations, inventory, invoice, and receipt queries previously discarded source errors. Its invoice fallback also included cancelled invoices in billed and outstanding totals when the finance-report RPC was unavailable. All sources now surface errors, and fallback billed/outstanding calculations exclude cancelled invoices. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live Analytics-to-Finance reconciliation remains deployment-gated.

## Source audit evidence — Quotations detail integrity

Quotations’ client selector previously ignored source errors, and opening an existing quotation ignored quotation-item read errors, allowing an edit dialog to appear with missing commercial lines. The selector now surfaces failures and the edit path reports item-load failures before allowing incomplete editing. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live quotation edit and downstream conversion retesting remains deployment-gated.

## Source audit evidence — Shared HR hook

The shared `useHRData` hook duplicated HR attendance, profiles, memberships, leave, performance, recruitment, training, skills, disciplinary, promotion, salary, and organization queries while discarding their errors. This created a second silent-failure path even after the HR page was hardened. The shared hook now throws source errors for every collection and metadata read. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live surfaces consuming this hook remain deployment-gated for retest.

## Source audit evidence — Finance dashboard sources

The Finance dashboard’s recent-expense, worker-payment, and AI-summary queries previously ignored backend errors, causing executive cards to display zeros or generic intelligence text when their sources were unavailable. Each query now throws into the dashboard’s query state. TypeScript and strict typecheck pass; lint completes with the existing non-blocking warning set; the 26-test suite passes; and `git diff --check` is clean.

## Source audit evidence — HR dashboard sources

The HR dashboard’s attendance, pending-leave, and AI-summary queries previously ignored backend errors, allowing workforce cards to show zero or generic intelligence when the source was unavailable. Each query now surfaces failures through query state. TypeScript, strict typing, lint, and the 26-test suite pass after the correction; live HR dashboard reconciliation remains deployment-gated.

## Source audit evidence — NotificationBell state integrity

NotificationBell previously discarded unread-message and sender-profile read errors, and only logged mark-read failures without informing the operator. Its reads now throw into query state, while single-message and mark-all read failures show destructive feedback. TypeScript and strict typecheck pass; lint completes with the existing non-blocking warning set; the 26-test suite passes; and `git diff --check` is clean.

## Source audit evidence — Project P&L integrity

Project P&L previously ignored failures while loading invoices, direct expenses, material requisitions, requisition items, project configuration, salaries, and attendance. It also counted draft and cancelled invoices as project revenue. The loader now surfaces every source failure and excludes non-operational invoice statuses from revenue. TypeScript and strict typecheck pass; lint completes with the existing non-blocking warning set; the 26-test suite passes; and `git diff --check` is clean.


## Live retest evidence — Finance after hardening pushes (2026-08-16)

The live Finance route now renders normally after loading; the earlier blank-shell behavior was not reproduced on this clean route. Live records remain visible: paid invoice `INVOICES/2026/0001` at ₦205,518.79 and cancelled QA invoice `INVOICES/2026/0001B` at ₦1,075.00. The cancelled record is correctly labelled `cancelled` and `Unlinked`, but the live aggregate still reports Revenue ₦206,593.79 and Receivables ₦1,075.00, proving that the cancellation-exclusion migration has not yet been applied to the production database/reporting function. This is a confirmed NO-GO release gate until the migration is applied and the totals retested. The shell-rendering blocker is currently not reproduced on this clean Finance navigation.

The live Finance page exposes the expected canonical controls (`CSV`, `Export PDF`, `New Invoice`, `Log Payment`, `Log Expense`, revision history, and PDF actions) and shows the paid invoice’s linked bank state. The cancelled QA record remains audit-visible as intended.

Evidence URL: https://nifhdpe.vercel.app/finance?tab=invoices&qa=hardening-retest
Evidence capture: /home/ubuntu/browser_html/nifhdpe_vercel_app_finance_1786874896150.html


## Live retest evidence — Document Registry source inconsistency (2026-08-16)

The live Documents Registry now renders cleanly on a fresh navigation, so the earlier blank-screen observation is not reproduced on this route. However, it reports `0 numbered documents on file`, `0 revisions`, and zero counts in every document category while live Finance contains two numbered invoices (`INVOICES/2026/0001` and cancelled `INVOICES/2026/0001B`). This confirms a real cross-module connectivity defect: Finance records are not being retrieved into the Document Registry for the current organization, or the registry is querying an incorrect/empty source. The registry controls (search, date range, CSV export, category filters) render, but registry persistence/reprint cannot receive a PASS until the source mismatch is fixed and retested.

Evidence URL: https://nifhdpe.vercel.app/documents?qa=hardening-retest


## Live retest evidence — Document Registry loaded state (2026-08-16)

After allowing the registry query to complete, the live Documents route reported `12 numbered documents on file` and `12 revisions`. The registry contained both Finance invoices (`INVOICES/2026/0001` paid and `INVOICES/2026/0001B` cancelled), one proforma, one quotation, one receipt, one waybill, two purchase orders, one goods-received note, and three worker payments. The waybill row displayed `Reprint` and status `Reprinted`; revision history showed invoice and purchase-order snapshots with current/superseded states. This proves the earlier `0` count was a transient loading capture, not a confirmed source mismatch. The route should still be tested for loading-state clarity because the initial content snapshot exposed a misleading zero before completion.

Evidence URL: https://nifhdpe.vercel.app/documents?qa=hardening-retest
Evidence capture: /home/ubuntu/browser_html/nifhdpe_vercel_app_documents_1786875001352.html

## UX hardening evidence — Document Registry loading state

The loaded registry is connected and complete, but the initial live capture exposed `0` documents before the asynchronous source query completed. The registry now displays `Loading numbered documents…` in the page summary and `Loading…` in the revision badge during the query, and displays an explicit unavailable summary when the query errors. TypeScript, strict typing, lint, and the 26-test suite pass after the correction.

## Source audit evidence — Admin Dashboard CEO visibility

Admin Dashboard unread-message counts and CEO overdue-invoice/cashflow queries previously ignored backend errors. Overdue and forecast invoice queries also included cancelled invoices. The dashboard now surfaces source failures and excludes cancelled invoices from overdue and expected-inflow metrics. TypeScript and strict typecheck pass; lint completes with the existing non-blocking warning set; the 26-test suite passes; and `git diff --check` is clean.


## Live deployment retest — Document Registry loading hardening (2026-08-16)

On the latest production navigation, the registry initially displayed `Loading numbered documents…` and a `Loading…` revision badge rather than a false zero. After the query completed on the same URL, it displayed 12 numbered documents and 12 revisions, including both Finance invoices and the reprintable waybill. This confirms the loading-state fix is deployed and behaves correctly in production.

Evidence URL: https://nifhdpe.vercel.app/documents?qa=latest-hardening
Evidence capture: /home/ubuntu/browser_html/nifhdpe_vercel_app_documents_1786875180864.html
