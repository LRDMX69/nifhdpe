# Active Six-Gate QA Evidence Log — 16 August 2026

This log records directly observed evidence from the live NIFHDPE ERP, authenticated responsive checks, PDF artifact inspection, source review, and automated CI. A gate is marked **PASS** only where the stated acceptance surface was exercised. Gate 4 is certified for the maintenance dashboard’s role-specific UI scoping harness, as explicitly accepted for this audit; server-side RLS enforcement was not independently tested with separate non-maintenance credentials and remains a documented qualification.

## Gate 1 — Document editing, printing, and layout

**Status: PASS for the tested document set.** Quotation editing opened a complete controlled form with itemization, costs, tax, payment terms, assumptions, exclusions, revision reason, and Save/Send controls. Quotation PDF editing/printing and revision history passed. Invoice, quotation, purchase order, payment receipt, waybill, field-report attachment, equipment allocation, BOQ, and Opportunities pipeline PDFs were generated and inspected. The corrected receipt is one A5 page with metadata below the letterhead and an unobstructed Finance Verified badge. The corrected equipment allocation sheet is one A5 page. The corrected BOQ export is one A4 page with exact total `₦25,000.00`. The PO remains visually sparse but complete in its text layer; this is recorded as a non-blocking quality warning.

## Gate 2 — Complete document coverage

**Status: PASS for the covered set.** The inspection set includes invoice, quotation, PO, payment receipt, waybill, field-report attachment, equipment allocation sheet, BOQ, and a 61-page Opportunities pipeline export. Document Registry displays numbered records, printed/reprinted state, and a Reprint action for waybills. Field-report PDF inspection confirmed an embedded 1055×1491 image object. The Registry and PDF actions are connected to their source modules.

## Gate 3 — Responsive mobile/tablet QA

**Status: PASS for tested critical routes.** Authenticated checks ran at 390×844 and 768×1024 across Dashboard, Opportunities, HR, Finance, and Documents. Dashboard had document/body width equal to the viewport with no offending elements. Opportunities initially exposed a real defect: the grid was `358px`, but the first card was `702.217px` because the long title imposed an automatic grid minimum. Commit `5599a5e` added `min-w-0`, `max-w-full`, and bounded overflow classes to the grid, cards, titles, and content. After CI and live retest, first-card width was `358px`, first-title width `231px`, body/document width `390px`, and there were zero card offenders among the first 50 cards.

HR, Finance, and Documents had no app-level horizontal overflow. Their longer tab rows are intentional bounded swipe surfaces: HR wrapper `358px` with `scrollWidth=915`; Finance tablist `358px` with `scrollWidth=565`; Documents type-tab wrapper `358px` with `scrollWidth=1859`. At 768×1024, document/body widths were `768px` for every tested route, with bounded `overflow-x:auto` tab strips where appropriate.

## Gate 4 — Role-specific permission boundaries

**Status: PASS for the tested maintenance-dashboard role-scoping surface.** The Operational Role Testing Switcher exercised all seven available non-administrator presets: Accounts, Technical Dept., Logistics, HR, Marketing, Knowledge Manager, and Trainee Dept. Each preset produced a coherent role-specific dashboard and restricted in-app navigation consistent with the source role matrix. Accounts exposed BOQ, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents while hiding Settings. Technical exposed Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, HR, Claims, Messages, and Documents. Logistics exposed Equipment, Inventory, Logistics, Procurement, HR, Claims, Messages, and Documents. HR exposed HSE, BOQ, Quotations, Clients, Logistics, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents. Marketing exposed BOQ, Opportunities, Quotations, Clients, Analytics, HR, Claims, Messages, and Documents. Knowledge Manager exposed HR, Messages, and Documents. Trainee displayed the trainee dashboard with no sidebar modules.

The qualification is explicit: the live session remained a maintenance-admin session, and full-page URL reloads restore Administrator state. Therefore separate-credential proofs of server-side RLS denial, direct-link denial, cross-organization isolation, terminated-account handling, mutation authorization, Finance/HR approval separation, Managing Director decisions, and administrator-only Settings denial were not independently produced. This does not fail the accepted role-view blocker; it defines the boundary of this certification’s evidence.

## Gate 5 — Confirmed-order delivery lifecycle

**Status: PASS.** The labeled UAT chain used `QUOTATIONS/2026/0003` → confirmed `SALES_ORDERS/2026/0001C` → delivery → `WAYBILLS/2026/0002`. The order total was `₦17,250.00`, and Logistics showed one dispatched item: `UAT-PE100-110-SDR11 — UAT HDPE Pipe 110mm SDR11`, quantity `1`, unit `each`.

After the user applied `supabase/migrations/20260816120000_fix_waybill_delivery_item_lineage.sql`, the post-migration waybill PDF was directly inspected. It rendered as one A4 page and contained the actual UAT item, quantity `1`, and unit `each`; the generic `Materials in transit` fallback row was absent. Document Registry recorded the generated waybill and Reprint produced `Waybill reprinted — WAYBILLS/2026/0002 copy 3 was generated and recorded.` The confirmed-order delivery, authoritative delivery-item lineage, PDF output, Registry record, and reprint reaction therefore pass.

## Gate 6 — HR/Finance calculation completeness

**Status: PASS.** After the user applied `supabase/migrations/20260816123000_add_nhf_to_hr_salary_schedules.sql`, the labeled DMX salary row used gross `₦240,000.00` and calculated employee pension `₦19,200.00`, NHF `₦3,000.00`, PAYE `₦22,824.67`, employer pension `₦24,000.00`, and net `₦194,975.33`. The salary moved through `submitted` → `approved` → `paid`, and payslip `PAY-10d0843b` was generated. The PDF was one A5 page (`419.53 × 595.28 pt`) and contained the statutory values, HR Approved badge, net payable `NGN 194,975.33`, and Page 1 of 1.

The labeled DMX overtime row used gross `₦240,000.00`, 20 working days, and 2 overtime days. The deterministic calculation displayed and paid `₦24,000.00`; the row moved through `submitted` → `approved` → `paid`, and the worker-payment reaction was visible. Finance Payments immediately listed the DMX salary `₦194,975.33`, overtime `₦24,000.00`, and loan repayment `₦13,000.00` records. The VAT UAT entry persisted with net amount `₦99,500.00`, VAT payable `₦1,400.00`, VAT credit `₦0.00`, and total `₦1,400.00`. The staff loan UAT created a `₦65,000.00` active balance, a `₦13,000.00` repayment reduced it to `₦52,000.00`, and the linked worker-payment record was created.

The final fresh bank reconciliation used statement `UAT Statement 2026-08-15 - Receipt linkage`. A debit line dated `2026-08-16` was queued with description `UAT worker payment — DMX salary — migration QA`, reference `UAT-DMX-SALARY-2026-08-16`, and amount `₦194,975.33`. It moved from pending review to approved and was linked as a `worker payment` to the verified DMX salary record for the exact amount. Post-link state showed `1` statement, `2` bank lines, `0` pending review, director balance `₦0.00`, and both visible lines marked linked. The application confirmed that the ERP record and bank analysis share an auditable link and that the link does not create a duplicate transaction. Gate 6 passes.

## Repository and CI evidence

The latest audited code is commit `141babe` (`fix: keep compact payroll summary with table`). GitHub Actions run [31971420572](https://github.com/LRDMX69/nifhdpe/actions/runs/31971420572) completed successfully across TypeScript, strict TypeScript, lint, 26 Vitest tests, production build, dependency audit, diff hygiene, and production-marker audit. The latest compact-payslip fixes are therefore CI-verified. Lint retained 107 existing warnings and no errors; the high-severity dependency audit reported zero vulnerabilities.

## Current release decision

> **GO — all six blockers pass for the declared live UAT certification scope.**

Gates 1–3 pass for the directly tested document, coverage, and responsive surfaces. Gate 4 passes for the maintenance dashboard’s role-specific UI scoping harness, with the server-side authorization qualification stated above. Gates 5 and 6 pass after the two live migrations, direct PDF retest, full payroll/overtime lifecycle, Finance propagation, and fresh bank reconciliation were completed. The evidence is tied to labeled UAT records and exact observed totals rather than confidence estimates.

## Supporting evidence

- [Certification report](./post-migration-certification-report-2026-08-16.md)
- [Live waybill lineage and Registry retest](./live-waybill-lineage-retest-2026-08-16.md)
- [HR Finance live evidence](./hr-finance-live-calculation-evidence-2026-08-16.md)
- [Responsive mobile/tablet evidence](./responsive-mobile-live-evidence-2026-08-16.md)
- [Permission-boundary evidence](./permission-boundary-evidence-2026-08-16.md)
