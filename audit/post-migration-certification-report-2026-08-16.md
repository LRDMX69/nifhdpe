# NIFHDPE ERP Live Production QA Certification Report

**System:** [NIF Technical Operations Suite](https://nifhdpe.vercel.app)  
**Repository:** [LRDMX69/nifhdpe](https://github.com/LRDMX69/nifhdpe)  
**Audit date:** 16 August 2026  
**Latest audited code commit:** `141babe` — `fix: keep compact payroll summary with table`
**Latest CI run:** [31971420572](https://github.com/LRDMX69/nifhdpe/actions/runs/31971420572) — **success**
**Execution basis:** Authenticated live maintenance-admin session, maintenance role-view harness, responsive mobile/tablet checks, live labeled UAT records, source inspection, PDF artifact inspection, local automated regression, and GitHub CI.

## Executive verdict

> **GO — all six blockers pass for the declared live UAT certification scope.**

The NIFHDPE ERP has completed the six-blocker production QA sequence requested for this release. The audit directly exercised document editing and printing, document Registry recording and reprinting, responsive layouts, maintenance-dashboard role scoping, confirmed-order delivery through waybill generation, statutory payroll and payslip output, overtime, VAT, staff loans and repayments, Finance propagation, and a fresh bank reconciliation link. The final evidence is tied to labeled UAT records and exact observed values; no confidence-based scoring is used.

The release is certified with one clearly bounded qualification. Gate 4 was accepted and passed through the maintenance dashboard’s Operational Role Testing Switcher, which directly rendered and checked all seven available role presets. Because the active browser identity remained the maintenance administrator, this audit did not independently prove server-side RLS denial using separate non-maintenance credentials. That limitation is recorded as a scope qualification, not as an open blocker, and does not change the requested six-blocker verdict.

## Six-blocker certification status

| Blocker | Direct live evidence | Final status |
|---|---|---|
| 1. Document editing, printing, and layout | Quotation editing/revision/PDF, invoice, quotation, PO, receipt, waybill, field-report attachment, equipment allocation, BOQ, and Opportunities export paths were inspected. Corrected receipt and equipment allocation PDFs are one A5 page; the BOQ export is one A4 page with exact total `₦25,000.00`. | **PASS** |
| 2. Complete document coverage | Invoice, quotation, PO, payment receipt, waybill, field-report attachment, equipment allocation sheet, BOQ, and 61-page Opportunities pipeline export were covered. Document Registry contains numbered waybill records and Reprint control. | **PASS** |
| 3. Responsive mobile/tablet QA | Authenticated checks at 390×844 and 768×1024 covered Dashboard, Opportunities, HR, Finance, and Documents. The reproduced Opportunities overflow defect was fixed, CI-verified, and live-retested with zero card offenders among the first 50 cards. | **PASS** |
| 4. Role-specific permission boundaries | Accounts, Technical Dept., Logistics, HR, Marketing, Knowledge Manager, and Trainee presets were exercised in the maintenance role switcher. Each produced the expected restricted in-app navigation and role-specific dashboard. | **PASS for accepted UI-scoping surface; server-side RLS separately unverified** |
| 5. Confirmed-order delivery lifecycle | `QUOTATIONS/2026/0003` → confirmed `SALES_ORDERS/2026/0001C` → delivery → `WAYBILLS/2026/0002`; post-migration PDF contains the actual UAT item, quantity `1`, unit `each`, and no generic fallback. Registry reprint was recorded. | **PASS** |
| 6. HR/Finance calculation completeness | Statutory payroll, payslip, overtime, Finance propagation, VAT, loan repayment, and fresh bank reconciliation all passed with exact values and auditable links. | **PASS** |

## Gate 1 — Document editing, printing, and layout

Quotation editing opened a complete controlled form with itemization, cost components, tax, payment terms, assumptions, exclusions, revision reason, and Save/Send controls. Quotation PDF editing/printing and revision history passed. Invoice, purchase order, payment receipt, waybill, field-report attachment, equipment allocation, BOQ, and Opportunities pipeline PDFs were generated and inspected.

The corrected payment receipt rendered as one A5 page with metadata below the letterhead and an unobstructed Finance Verified badge. The equipment allocation sheet rendered as one A5 page. The BOQ export rendered as one A4 page with a seven-column table and exact total `₦25,000.00`. The PO remains visually sparse but complete in its text layer and is retained as a non-blocking quality warning.

## Gate 2 — Complete document coverage

The cumulative inspection set covers invoice, quotation, purchase order, payment receipt, waybill, field-report attachment, equipment allocation sheet, BOQ, and the full Opportunities pipeline export. The Opportunities export is 61 A4 pages with repeated table headers and continuous page numbering. Field-report PDF inspection confirmed an embedded 1055×1491 image object.

Document Registry displayed numbered records and the waybill’s printed/reprinted state. Generating a waybill created a Registry record, and reprinting the same waybill generated a new recorded copy rather than an untracked browser-only download. The tested document actions are connected to their source modules.

## Gate 3 — Responsive mobile/tablet QA

At 390×844, Dashboard measured document and body scroll widths of `390px` with no offending elements. Opportunities initially exposed a real defect: the grid was `358px` wide while the first card was `702.217px` because the long title imposed the grid item’s automatic minimum content size. The fix added `min-w-0`, `max-w-full`, and bounded overflow classes to the grid, cards, titles, and content. The live retest measured grid width `358px`, first-card width `358px`, first-title width `231px`, document/body width `390px`, and zero card offenders among the first 50 cards.

HR, Finance, and Documents also passed application-level containment at 390×844. Their longer tab rows are intentional bounded swipe surfaces: HR wrapper `358px` with `scrollWidth=915`; Finance tablist `358px` with `scrollWidth=565`; Documents document-type strip `358px` with `scrollWidth=1859`. At 768×1024, document and body widths were `768px` on every tested route, and the tab strips remained bounded with `overflow-x:auto` where required.

## Gate 4 — Role-specific permission boundaries

The source role matrix and live maintenance role-view harness were exercised together. The Accounts preset exposed BOQ, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents while hiding Settings. Technical exposed Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, HR, Claims, Messages, and Documents. Logistics exposed Equipment, Inventory, Logistics, Procurement, HR, Claims, Messages, and Documents. HR exposed HSE, BOQ, Quotations, Clients, Logistics, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents. Marketing exposed BOQ, Opportunities, Quotations, Clients, Analytics, HR, Claims, Messages, and Documents. Knowledge Manager exposed HR, Messages, and Documents. Trainee displayed the trainee dashboard with no sidebar modules.

The result is a **PASS for role-specific UI visibility and navigation scoping** under the maintenance dashboard’s explicit testing mechanism. The session remained maintenance-admin with `isMaintenance=true`; full-page URL navigation restores Administrator state. Consequently, this report does not claim separate-credential proof of backend RLS denial, direct-link denial, cross-organization isolation, terminated-account blocking, mutation authorization, Finance/HR approval separation, Managing Director decisions, or administrator-only Settings denial. Those are follow-up security-hardening tests if independent authorization certification is required beyond this six-blocker scope.

## Gate 5 — Confirmed-order delivery lifecycle

The labeled UAT commercial chain used `QUOTATIONS/2026/0003`, confirmed `SALES_ORDERS/2026/0001C`, and linked product specification `UAT-PE100-110-SDR11`. Sales-order confirmation succeeded with stock-reservation evaluation. Logistics then showed the linked order reference `SALES_ORDERS/2026/0001C`, order total `₦17,250.00`, and one dispatched item.

After the user applied `supabase/migrations/20260816120000_fix_waybill_delivery_item_lineage.sql`, the existing waybill was retested directly. `WAYBILLS/2026/0002 (3).pdf` rendered as one A4 page and contained `UAT-PE100-110-SDR11 — UAT HDPE Pipe 110mm SDR11`, quantity `1`, and unit `each`. The generic `Materials in transit` fallback row was absent. Document Registry displayed the waybill and the reprint action confirmed `Waybill reprinted — WAYBILLS/2026/0002 copy 3 was generated and recorded.` The delivery-item lineage, PDF content, Registry record, and reprint reaction all pass.

## Gate 6 — HR/Finance calculation completeness

After the user applied `supabase/migrations/20260816123000_add_nhf_to_hr_salary_schedules.sql`, the labeled DMX salary schedule used gross `₦240,000.00`. The live calculation displayed employee pension `₦19,200.00`, NHF `₦3,000.00`, PAYE `₦22,824.67`, employer pension `₦24,000.00`, and net payable `₦194,975.33`. The row moved through `submitted` → `approved` → `paid`, and payslip `PAY-10d0843b` was generated.

`employee-payslip-PAY-10d0843b-2026-08-01 (3).pdf` was verified as one A5 page (`419.53 × 595.28 pt`). Its text layer contained employee DMX, period `2026-08-01 to 2026-08-16`, gross salary `NGN 240,000.00`, employee pension `NGN 19,200.00`, NHF `NGN 3,000.00`, PAYE/tax `NGN 22,824.67`, HR Approved badge, net payable `NGN 194,975.33`, and Page 1 of 1.

The labeled DMX overtime row used monthly gross `₦240,000.00`, a 20-day working basis, and 2 overtime days. The deterministic calculation displayed `₦24,000.00`; the row moved through `submitted` → `approved` → `paid`, and the worker-payment reaction was visible. Finance Payments immediately listed salary `₦194,975.33`, overtime `₦24,000.00`, and the existing loan repayment `₦13,000.00`.

The VAT UAT entry used gross `₦100,000.00`, output VAT `₦7,500.00`, input VAT `₦2,500.00`, VAT withheld `₦500.00`, VAT paid `₦3,000.00`, penalty `₦100.00`, interest `₦50.00`, and brought forward `₦250.00`. It persisted with net amount `₦99,500.00`, VAT payable `₦1,400.00`, VAT credit `₦0.00`, and total `₦1,400.00`. The staff-loan UAT created an active `₦65,000.00` balance; a `₦13,000.00` repayment reduced it to `₦52,000.00` and created the linked worker-payment record.

The final fresh bank reconciliation used statement `UAT Statement 2026-08-15 - Receipt linkage`. A line dated `2026-08-16` was created with description `UAT worker payment — DMX salary — migration QA`, reference `UAT-DMX-SALARY-2026-08-16`, direction `Debit`, and amount `₦194,975.33`. It moved from queued review to approved and was linked as `worker payment` to the verified DMX salary record `e5a6c41c-8945-44d2-b3e5-a6f1bdc03c9d` for the exact amount. The final connected view showed `1` statement, `2` bank lines, `0` pending review, and director balance `₦0.00`; both visible lines were marked linked. The application confirmed that the ERP record and bank analysis share an auditable link and that the link does not create a duplicate transaction.

## Automated and repository quality results

The latest audited code is commit `141babe`. GitHub Actions run [31971420572](https://github.com/LRDMX69/nifhdpe/actions/runs/31971420572) completed successfully across TypeScript, strict TypeScript, 26 Vitest tests, production build, lint, high-severity dependency audit, diff hygiene, and production-marker audit. The compact payroll table and one-page A5 payslip fixes are therefore CI-verified. Lint retained 107 existing warnings and no errors, while `npm audit --audit-level=high` reported zero vulnerabilities.

## Release certification decision

**GO.** All six requested blockers pass for the live UAT certification scope. The release is supported by direct browser actions, exact database-backed values, inspected PDF artifacts, role-view evidence, responsive measurements, and successful CI. The only stated qualification is that Gate 4’s evidence certifies role-specific UI scoping through the maintenance dashboard harness, not independent non-maintenance server-side RLS enforcement.

## Evidence files

- [Six-gate evidence log](./remaining-release-gates-qa-2026-08-16.md)
- [Live waybill lineage and Registry retest](./live-waybill-lineage-retest-2026-08-16.md)
- [HR Finance live calculation evidence](./hr-finance-live-calculation-evidence-2026-08-16.md)
- [Responsive mobile/tablet live evidence](./responsive-mobile-live-evidence-2026-08-16.md)
- [Permission-boundary evidence](./permission-boundary-evidence-2026-08-16.md)
- [Live Document Registry](https://nifhdpe.vercel.app/documents?qa=certification-registry-2026-08-16)
- [Live Logistics delivery](https://nifhdpe.vercel.app/logistics?qa=certification-waybill-lineage-2026-08-16)
- [Live HR Finance](https://nifhdpe.vercel.app/hr?qa=certification-hr-finance-2026-08-16)

### References

[1]: https://nifhdpe.vercel.app "NIF Technical Operations Suite — live production application"
[2]: https://github.com/LRDMX69/nifhdpe/commit/141babe "NIFHDPE latest audited code commit"
[3]: https://github.com/LRDMX69/nifhdpe/actions/runs/31971420572 "NIFHDPE CI quality gate — successful run"
