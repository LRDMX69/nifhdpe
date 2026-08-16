# Active Six-Gate QA Evidence Log — 16 August 2026

This log records only observed evidence. A gate is marked **PASS** only after the live behavior was directly exercised. The maintenance-admin session is not treated as proof of real non-maintenance permissions.

## Gate 1 — Document editing, printing, and layout

**Status: PASS for the tested document set.** Quotation editing opened a complete controlled form with itemization, costs, tax, payment terms, assumptions, exclusions, revision reason, and Save/Send controls. Quotation PDF editing/printing and revision history passed. Invoice, quotation, purchase order, payment receipt, waybill, field-report attachment, equipment allocation, BOQ, and Opportunities pipeline PDFs were generated and inspected. The corrected receipt is one A5 page with metadata below the letterhead and an unobstructed Finance Verified badge. The corrected equipment allocation sheet is one A5 page. The corrected BOQ export is one A4 page with exact total `₦25,000.00`. The PO remains visually sparse but complete in its text layer; this is a non-blocking layout-quality warning.

## Gate 2 — Complete document coverage

**Status: PASS for the covered set.** The inspection set includes invoice, quotation, PO, receipt, waybill, field-report attachment, equipment allocation sheet, BOQ, and a 61-page Opportunities pipeline export. Document Registry displays numbered records and a Reprint action for waybills. Field-report PDF inspection confirmed an embedded 1055×1491 image object. The registry and PDF actions are connected to their source modules.

## Gate 3 — Responsive mobile/tablet QA

**Status: PASS for tested critical routes.** An authenticated Playwright session was tested at 390×844 and 768×1024 across Dashboard, Opportunities, HR, Finance, and Documents. Dashboard had document/body width equal to the viewport with no offending elements. Opportunities initially exposed a real defect: the grid was `358px`, but the first card was `702.217px` because the long title imposed an automatic grid minimum. Commit `5599a5e` added `min-w-0`, `max-w-full`, and bounded overflow classes to the grid, cards, titles, and content. After CI run `31964777644`, the live retest measured first-card width `358px`, first-title width `231px`, body/document width `390px`, and zero card offenders among the first 50 cards.

HR, Finance, and Documents had no app-level horizontal overflow. Their longer tab rows are intentional bounded swipe surfaces: HR wrapper `358px`, internal `scrollWidth=915`; Finance tablist `358px`, `scrollWidth=565`; Documents type-tab wrapper `358px`, `scrollWidth=1859`. At 768×1024, document/body widths were `768px` for every tested route. The HR, Finance, and Documents tab strips remained bounded with `overflow-x:auto`.

## Gate 4 — Real permission boundaries

**Status: BLOCKED.** The live session used maintenance-admin account Ola, effective role administrator with `isMaintenance=true`. The source role matrix defines Administrator, Technical, Logistics, Accounts/Finance, HR, Marketing, Knowledge Manager, and Trainee roles; HR inherits Finance capability, and Settings is administrator-only. Navigation-level role views are not equivalent to separate RLS-enforced sessions because maintenance mode intentionally exposes full access.

Unverified boundaries include direct-link denial, create/edit/delete authorization, Finance/HR approval separation, MD decisions, cross-organization access, terminated-account blocking, Knowledge Manager restrictions, and administrator-only Settings. Controlled non-maintenance accounts are required before this gate can be PASS.

## Gate 5 — Confirmed-order delivery lifecycle

**Status: BLOCKED pending live migration retest.** `QUOTATIONS/2026/0003` was accepted and converted to `SALES_ORDERS/2026/0001C`. Confirmation succeeded with stock reservation evaluation. Logistics showed `SALES_ORDERS/2026/0001C`, `₦17,250.00`, and one dispatched `UAT-PE100-110-SDR11` item with quantity `1`. Waybill generation recorded `WAYBILLS/2026/0002`; Document Registry showed the row as Reprinted, and Reprint produced `Waybill reprinted — WAYBILLS/2026/0002 copy 3 was generated and recorded.`

The remaining problem is the persisted JSONB snapshot in the already-issued idempotent waybill. The PDF still showed the historical `Materials in transit` fallback row until the new authoritative migration is applied. Apply `supabase/migrations/20260816120000_fix_waybill_delivery_item_lineage.sql`, then regenerate/reprint the same waybill and verify the PDF contains `UAT-PE100-110-SDR11` and quantity `1`. Do not mark this gate PASS before that direct PDF retest.

## Gate 6 — HR/Finance calculation completeness

**Status: BLOCKED pending live migration and lifecycle retest.** The salary preview for employee DMX and gross `₦240,000.00` displayed employee pension `₦19,200.00`, NHF `₦3,000.00`, PAYE `₦22,824.67`, employer pension `₦24,000.00`, and net `₦194,975.33`. The new salary form carries an explicit schedule note, but the end-to-end salary row was not saved because the NHF column requires the new migration.

The VAT UAT entry displayed net amount `₦99,500.00`, VAT payable `₦1,400.00`, VAT credit `₦0.00`, and total `₦1,400.00`; Save produced `VAT schedule entry saved` and the UAT client appeared in the list. The overtime preview for gross `₦240,000.00`, 20 working days, and 2 overtime days displayed `₦24,000.00`; the new form persists a schedule note, but no overtime row was saved during the preview. The staff-loan UAT of `₦60,000.00 + ₦5,000.00` over five months displayed `₦13,000.00` monthly repayment, saved successfully, and after a `₦13,000.00` repayment the balance moved from `₦65,000.00` to `₦52,000.00` with a linked worker-payment row.

The Bank & Reconciliation view showed 1 statement, 1 bank line, 0 pending review, and director balance `₦0.00`; the visible `UAT payment for INVOICES/2026/0001` line was already linked for `+₦205,518.79`. A fresh reconciliation was not created because no pending review line was available. Apply `supabase/migrations/20260816123000_add_nhf_to_hr_salary_schedules.sql`, then create, approve, pay, and print the labeled salary and overtime UAT rows. Verify NHF in the payslip and propagation into Finance, Registry, and worker payments, then run a fresh bank reconciliation case.

## Repository and CI evidence

Local typecheck, strict typecheck, 26 tests, production build, lint, and high-severity audit passed. Lint reported 107 existing warnings and no errors; `npm audit --audit-level=high` reported zero vulnerabilities. GitHub Actions run [31964777644](https://github.com/LRDMX69/nifhdpe/actions/runs/31964777644) passed the complete quality gate, including TypeScript, strict TypeScript, lint, tests, production build, dependency audit, diff hygiene, and production-marker audit.

## Current release decision

**NO-GO.** Gates 1–3 are closed for the tested scope. Gate 4 is blocked by unavailable role accounts. Gates 5–6 require the two forward database migrations and direct live retests. The application is materially hardened, but the remaining gates cannot be passed by inference.

## Supporting evidence

- [Certification report](./post-migration-certification-report-2026-08-16.md)
- [Live waybill lineage and Registry retest](./live-waybill-lineage-retest-2026-08-16.md)
- [HR Finance live evidence](./hr-finance-live-calculation-evidence-2026-08-16.md)
- [Responsive mobile/tablet evidence](./responsive-mobile-live-evidence-2026-08-16.md)
- [Permission-boundary evidence](./permission-boundary-evidence-2026-08-16.md)
