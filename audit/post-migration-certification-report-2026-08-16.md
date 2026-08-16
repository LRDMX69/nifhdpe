# NIFHDPE ERP Live Production QA Certification Report

**System:** [NIF Technical Operations Suite](https://nifhdpe.vercel.app)  
**Repository:** [LRDMX69/nifhdpe](https://github.com/LRDMX69/nifhdpe)  
**Audit date:** 16 August 2026  
**Latest repository commit:** `5599a5e` — `fix: constrain opportunity cards on mobile`
**Latest CI run:** [31964777644](https://github.com/LRDMX69/nifhdpe/actions/runs/31964777644) — **success**
**Execution basis:** Authenticated live maintenance-admin session, fresh mobile/tablet Playwright session, live UAT records, source inspection, PDF artifact inspection, local automated regression, and GitHub CI.

## Executive verdict

> **NO-GO for final production certification at this checkpoint.**

The audit closed several important defects. The confirmed delivery card now carries the sales-order reference, order total, and dispatched item lineage. Document Registry records and reprints waybills. The reproduced Opportunities mobile overflow defect was fixed and retested at 390×844 with the first 50 cards constrained to the viewport. Mobile and tablet route checks passed for Dashboard, Opportunities, HR, Finance, and Documents when intentional horizontal tab/table scrolling was distinguished from application-level overflow. VAT, overtime, staff-loan, loan-repayment, and Nigerian payroll preview calculations were executed with exact observed values. Local regression and CI are green.

A final **GO** cannot yet be issued because three release-critical conditions remain unclosed. The new waybill lineage migration and the new NHF salary-schedule migration have not been confirmed as applied to the live database, so the actual persisted waybill PDF snapshot and full payroll approval-to-payslip lifecycle are not certified. In addition, the only live account available is the privileged maintenance administrator; real non-maintenance authorization boundaries remain untested. These are evidence gates, not confidence scores.

## Six blocker status

| Blocker | Current evidence | Status | Closure required before GO |
|---|---|---|---|
| 1. Document editing, printing, and layout | Quotation editing/revision/PDF, invoice, quotation, PO, receipt, waybill, field-report attachment, equipment allocation, BOQ, and Opportunities export paths were inspected. PO visual hierarchy remains a non-blocking quality warning; the tested receipt and other corrected artifacts are readable and proportionate. | **PASS for the tested document set** | Continue routine visual monitoring; the PO metadata hierarchy warning should be improved in a later quality pass. |
| 2. Complete document coverage | Invoice, quotation, PO, payment receipt, waybill, field-report attachment, equipment allocation, BOQ, and 61-page Opportunities pipeline exports were covered. Document Registry contains the waybill rows and reprint control. | **PASS for covered types** | No blocker-level closure remains in the tested document set. |
| 3. Responsive mobile/tablet QA | Authenticated Playwright checks ran at 390×844 and 768×1024 across Dashboard, Opportunities, HR, Finance, and Documents. The Opportunities defect was reproduced, fixed, CI-verified, and live-retested. | **PASS for tested critical routes** | Extend the same measured matrix to the remaining critical routes during future releases. |
| 4. Real permission boundaries | Source role matrix and navigation scoping were inspected, but only the maintenance administrator account was available. Maintenance mode intentionally exposes full access. | **BLOCKED** | Provide controlled non-maintenance accounts and execute deep-link denial, CRUD, approval, MD-decision, cross-organization, terminated-account, and administrator-only Settings tests. |
| 5. Confirmed-order delivery lifecycle | Quotation acceptance → sales-order confirmation → reservation → delivery creation → order-linked Logistics card → waybill recording → Registry reprint was observed. The card showed `SALES_ORDERS/2026/0001C`, `₦17,250.00`, one dispatched `UAT-PE100-110-SDR11` item, and the Registry reprint reaction. The new authoritative snapshot migration has not been confirmed applied, so the generated PDF still requires one final retest. | **BLOCKED pending live migration retest** | Apply `20260816120000_fix_waybill_delivery_item_lineage.sql`, regenerate/reprint `WAYBILLS/2026/0002`, and verify the PDF contains the actual item and quantity rather than `Materials in transit`. |
| 6. HR/finance calculation completeness | VAT and loan flows were persisted; overtime and payroll calculations were previewed with exact values. NHF persistence is implemented in code and a forward migration exists, but payroll approval → worker payment → payslip was not completed against the migrated live schema. Fresh bank reconciliation was not created because the current linked UAT line had no pending review. | **BLOCKED pending migration and lifecycle retest** | Apply `20260816123000_add_nhf_to_hr_salary_schedules.sql`; create, approve, pay, and print the labeled payroll UAT row; create/approve/pay the labeled overtime row; verify VAT, loan schedule/repayment, payslip NHF, Finance, Registry, and Bank outputs; perform a fresh bank reconciliation case. |

## Exact live evidence

### Confirmed-order delivery and waybill lineage

The final UAT commercial chain used `QUOTATIONS/2026/0003`, `SALES_ORDERS/2026/0001C`, and the linked product specification `UAT-PE100-110-SDR11`. Sales-order confirmation succeeded with stock-reservation evaluation. The Logistics delivery card subsequently showed the linked order reference `SALES_ORDERS/2026/0001C`, order total `₦17,250.00`, and one dispatched item with quantity `1`.

The waybill action produced the live notification that `WAYBILLS/2026/0002` was available in Document Registry. Registry showed the waybill as `Reprinted`, and the Reprint action produced the notification `Waybill reprinted — WAYBILLS/2026/0002 copy 3 was generated and recorded.` The remaining gap is the content snapshot: the current live PDF still contained the historical generic `Materials in transit` row because the existing idempotent waybill record is not refreshed until the new migration is applied.

The forward migration makes `delivery_items` authoritative, refreshes generic existing snapshots, and preserves idempotent reprints. Until the migration is applied and the PDF is directly inspected, the lifecycle is not a final PASS.

### HR and Finance calculations

The deployed payroll preview accepted employee `DMX` and gross salary `₦240,000.00`. It displayed employee pension `₦19,200.00`, NHF `₦3,000.00`, PAYE `₦22,824.67`, employer pension `₦24,000.00`, and net payable `₦194,975.33`. The form now carries a schedule-note field so the final record can be explicitly labeled as UAT.

The VAT UAT entry used gross `₦100,000.00`, output VAT `₦7,500.00`, input VAT `₦2,500.00`, VAT withheld `₦500.00`, VAT paid `₦3,000.00`, penalty `₦100.00`, interest `₦50.00`, and brought forward `₦250.00`. The live preview displayed net amount `₦99,500.00`, VAT payable `₦1,400.00`, VAT credit `₦0.00`, and total `₦1,400.00`. Saving produced `VAT schedule entry saved`, and the UAT client appeared immediately in the list at `₦1,400.00`.

The overtime preview used monthly gross `₦240,000.00`, a 20-day working basis, and 2 overtime days. The live calculation displayed `₦24,000.00`. The form now persists a schedule note, but no overtime row was saved during this preview.

The staff-loan UAT used employee `DMX`, amount `₦60,000.00`, additional loan `₦5,000.00`, and five months. The preview displayed monthly repayment `₦13,000.00`. Saving with note `UAT staff loan repayment schedule QA — 2026-08-16` created an active loan with balance `₦65,000.00`. Recording a `₦13,000.00` repayment with note `UAT loan repayment reaction QA — first scheduled installment` immediately reduced the live balance to `₦52,000.00` and created the linked worker-payment record `WORKER_PAYMENTS/2026/0004`.

The connected Bank & Reconciliation Oversight view showed 1 statement, 1 bank line, 0 pending review, and director balance `₦0.00`. The visible linked line was `UAT payment for INVOICES/2026/0001` for `+₦205,518.79`. This confirms the current linked state but not a newly reconciled test line.

### Responsive QA

At 390×844, Dashboard measured document and body scroll widths of `390px` with no offending elements. Opportunities initially exposed a real defect: the grid was `358px` wide, while the first card was `702.217px` wide because the long title imposed the grid item’s automatic minimum content size. The fix added `min-w-0`, `max-w-full`, and bounded overflow classes to the grid, cards, titles, and content. After CI, the live retest measured grid width `358px`, first-card width `358px`, first-title width `231px`, document/body scroll widths `390px`, and zero card offenders among the first 50 cards.

HR, Finance, and Documents also passed app-level containment at 390×844. Their longer tab rows are intentionally bounded swipe surfaces: HR’s wrapper was `358px` wide with `scrollWidth=915`; Finance’s tablist was `358px` wide with `scrollWidth=565`; Documents’ document-type strip was `358px` wide with `scrollWidth=1859`. At 768×1024, Dashboard and Opportunities had no offenders, while HR, Finance, and Documents retained bounded `overflow-x:auto` tab strips and document/body widths equal to `768px`.

### Document coverage

The cumulative PDF inspection set covers the invoice, quotation, purchase order, payment receipt, waybill, field-report attachment, equipment allocation sheet, BOQ, and full Opportunities pipeline export. The corrected receipt is one A5 page with an unobstructed acknowledgement and Finance Verified badge. The corrected equipment sheet is one A5 page. The BOQ export is one A4 page with the seven-column table and exact total `₦25,000.00`. The field-report PDF contains an embedded 1055×1491 image. The Opportunities export is 61 A4 pages with repeated table headers and continuous page numbering. The PO is functionally complete in the text layer but remains visually sparse; this is recorded as a non-blocking quality warning rather than a missing-data defect.

## Authorization boundary status

The live maintenance account is privileged by `isMaintenance=true` and receives effective role `administrator`. The source role matrix defines Administrator, Technical, Logistics, Accounts/Finance, HR, Marketing, Knowledge Manager, and Trainee roles. HR inherits Finance capability in the current organization model. Settings is administrator-only. Navigation-level role views were previously exercised through the maintenance role switcher, but that is not equivalent to a separate session with RLS and route denial enforced.

The following remain unverified and cannot be marked PASS: direct-link denial, create/edit/delete authorization, Finance and HR approval separation, Managing Director decisions, cross-organization access, terminated-account blocking for a non-maintenance user, Knowledge Manager restrictions, and administrator-only Settings access. No non-maintenance credentials were available.

## Automated and repository quality results

The final local regression completed the required typecheck, strict typecheck, 26 Vitest tests, production build, lint, and high-severity dependency audit. The result was **PASS**, with zero high-severity vulnerabilities. Lint emitted 107 existing warnings and no errors. GitHub Actions run `31964777644` also completed successfully across TypeScript, strict TypeScript, lint, behavior/regression tests, production build, dependency audit, diff hygiene, and production-marker audit. CI annotations were non-blocking existing `any`/Fast Refresh warnings and the GitHub Actions Node.js 20 deprecation notice.

## Required final closure sequence

Before a GO decision, apply the two forward migrations from `main`:

1. `supabase/migrations/20260816120000_fix_waybill_delivery_item_lineage.sql`
2. `supabase/migrations/20260816123000_add_nhf_to_hr_salary_schedules.sql`

Then retest the existing labeled UAT records without creating duplicate business chains. The waybill test must confirm the persisted PDF contains `UAT-PE100-110-SDR11` and quantity `1`. The HR test must create the labeled salary and overtime rows, approve them, create their worker payments, generate the payslip, and verify NHF, Finance, Registry, and Bank reactions. Finally, provide controlled non-maintenance accounts and run the authorization matrix.

## Evidence files

- [Live waybill lineage and Registry retest](./live-waybill-lineage-retest-2026-08-16.md)
- [HR Finance implementation/test plan](./hr-finance-calculation-test-plan-2026-08-16.md)
- [HR Finance live calculation evidence](./hr-finance-live-calculation-evidence-2026-08-16.md)
- [Responsive mobile/tablet live evidence](./responsive-mobile-live-evidence-2026-08-16.md)
- [Permission-boundary evidence](./permission-boundary-evidence-2026-08-16.md)
- [Active release-gate evidence log](./remaining-release-gates-qa-2026-08-16.md)
- [Live Document Registry](https://nifhdpe.vercel.app/documents?qa=certification-registry-2026-08-16)
- [Live Logistics delivery](https://nifhdpe.vercel.app/logistics?qa=certification-waybill-lineage-2026-08-16)
- [Live HR Finance](https://nifhdpe.vercel.app/hr?qa=certification-hr-finance-2026-08-16)

## Certification decision

**NO-GO.** The current build is materially hardened and the tested surfaces are connected, but final production certification requires direct evidence for the two new live database migrations and real non-maintenance authorization boundaries. This decision is intentionally conservative and follows the requirement that a gate is marked PASS only after it has actually been tested.

### References

[1]: https://nifhdpe.vercel.app "NIF Technical Operations Suite — live production application"
[2]: https://github.com/LRDMX69/nifhdpe/commit/5599a5eb4363151dc044877f8d17850c401d89ef "Latest mobile overflow fix commit"
[3]: https://github.com/LRDMX69/nifhdpe/actions/runs/31964777644 "NIFHDPE CI quality gate — successful run"
