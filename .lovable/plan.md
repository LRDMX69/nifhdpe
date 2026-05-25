## Goal

Boss + team will use this for 3 months unattended. Every document not limited to (Invoice, Quotation, Waybill, ID Card, Receipt, Payslip, Claim, Report, Delivery Note, Purchase Order) must be:

1. **Findable in ≤2 clicks** — no hunting through dropdowns.
2. **Professionally numbered** — `INV/2026/0042`, `WB/2026/0017`, etc., auto-generated, never blank.
3. **Generated inside the ERP** — printable, downloadable, emailable. Zero need for Word or Excel.

---

## 1. Surface every hidden document action

Audit found these are buried today:


| Document                                | Where it lives now                                                            | Fix                                                                                                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Waybill**                             | Inside a 3-dot dropdown on a Logistics delivery row                           | Add "+ New Waybill" button on Logistics page header + standalone `WaybillDialog` (driver, vehicle, destination, items) — works even without a linked delivery. Add to Command Palette + Quick Actions. |
| **ID Card**                             | HR → Employee details panel only                                              | Add "Generate ID Card" row action in HR ID Cards tab list + Command Palette entry.                                                                                                                     |
| **Payslip**                             | Buried in Payroll tab                                                         | Add "Download Payslip" per row + bulk "Download All Payslips for Month".                                                                                                                               |
| **Receipt** (payment)                   | Not generated at all today                                                    | Add receipt PDF after recording a payment on an invoice.                                                                                                                                               |
| **Delivery Note**                       | Conflated with Waybill                                                        | Add as a Logistics action — confirms goods received at site (signed copy).                                                                                                                             |
| **Purchase Order**                      | Procurement page exists, no PDF                                               | Add "Generate PO PDF" with proper PO numbering.                                                                                                                                                        |
| **Quotation → Invoice → Receipt chain** | Quotation has "Convert to Invoice"; Invoice has no "Record Payment → Receipt" | Add Record Payment dialog on each invoice that auto-issues a Receipt PDF.                                                                                                                              |
| **Claim Voucher**                       | Claim approved but no printable voucher                                       | Generate a Claim Approval Voucher PDF on approval.                                                                                                                                                     |
| **Field Report PDF**                    | Only viewable in-app                                                          | Add "Download Report PDF" with signed-by block.                                                                                                                                                        |


### Discoverability surfaces (no UI clutter)

- **Command Palette (⌘K)** — already exists. Add every document creator: New Waybill, New Delivery Note, New PO, New Receipt, Generate ID Card, Download Payslip, Print Quotation, Print Invoice.
- **Quick Actions row** on each dashboard — role-scoped (Logistics sees Waybill/Delivery Note, Finance sees Invoice/Receipt/PO, HR sees ID Card/Payslip).
- **Page header CTA** on Logistics, Procurement, HR, Finance, Claims — single prominent "+ New [Document]" button.
- **Empty-state CTAs** — "No waybills yet — Create your first waybill" instead of a blank table.

---

## 2. Professional document numbering (single source of truth)

The DB already has `next_doc_number(org, doc_type)` returning `<TYPE>/<YYYY>/<####>` and an `auto_assign_doc_number` trigger.

Action:

- Audit every table that holds a document (`invoices`, `quotations`, `waybills`, `delivery_notes`, `purchase_orders`, `receipts`, `id_cards`, `payslips`, `claim_vouchers`, `field_reports`). Confirm each has a `document_number` column with the trigger attached. Add via migration where missing.
- Standardize prefixes:
  ```text
  Quotation        QT/2026/0001
  Invoice          INV/2026/0001
  Receipt          RCT/2026/0001
  Waybill          WB/2026/0001
  Delivery Note    DN/2026/0001
  Purchase Order   PO/2026/0001
  Claim Voucher    CV/2026/0001
  Payslip          PSL/2026/MM/EMP-0001
  ID Card          NIF-EMP-####
  Field Report     FR/2026/0001
  ```
- Display the number prominently on every list view, every PDF header, every email subject. Numbers are immutable once issued.
- Add a small **"Document Registry"** view in Settings (admin only) — searchable list of every document number ever issued, with link to the source record. Solves "did we already invoice this?".

---

## 3. Polish every generated PDF (enterprise look)

Unified template via `generatePdf.ts`:

- Header: org logo (left), company name + RC + address + phone + email (right).
- Document title + number + issue date (large, top-center).
- Body: structured sections (parties, line items, totals, notes).
- Footer: page x/y, "Issued by [name, role]", signature line, round stamp placeholder, "Generated by NIF Operations Suite — [timestamp]".
- Naira `₦` formatting throughout, A4 margins, draft watermark until status = sent/approved.
- "Print Preview" modal before download (uses an iframe of the blob URL).

Apply uniformly to: Invoice, Quotation, Waybill, Delivery Note, PO, Receipt, Payslip, Claim Voucher, Field Report, ID Card (ID card stays badge-format, but with consistent branding).

---

## 4. Zero-Excel workflows

Replace any "export to Excel and edit" temptation with in-app tools:

- **Bulk actions** on Invoices/Quotations/Claims lists: multi-select → Mark Paid / Send / Download as ZIP of PDFs / Email to client.
- **Inline edit** on line items in Quotation/Invoice/PO dialogs (no need to recreate to change one line).
- **CSV/PDF export** buttons on every list view (Analytics, Inventory, Payroll, Attendance) so they never need to copy-paste.
- **Search + filter chips** on every list (Today / This week / This month / Pending / Paid / Overdue).
- **In-app print** (browser print stylesheet) for any table view.

---

## 5. Onboarding & in-app guidance (so you don't need to be there)

- First-login **role-based welcome tour** (already partly built in `RoleBasedOnboarding`): expand to 4 steps per role pointing at the Quick Actions, Command Palette (⌘K hint), Messages, and their primary document type.
- **? help icon** in the top bar opening a slide-out cheat sheet: "How do I create an invoice / waybill / ID card / claim?" with 1-line answers + deep links.
- **Empty-state copy** everywhere: action-oriented, not "No data".
- **Toast confirmations** with the issued document number: "Waybill WB/2026/0017 created — Print / Email / Done".

---

## 6. Verification

- `tsc --noEmit` clean.
- Manual walkthrough at 1440px and 390px of every flow in §1 — each document creatable in ≤2 clicks from Dashboard or via ⌘K.
- Every PDF visually inspected (header/footer/number present, naira, no clipping).
- Supabase: every doc table has `document_number` NOT NULL + trigger.
- Smoke test on real phone via `nifhdpe.vercel.app`.

---

## Technical notes (engineer-only)

**Files to create**

- `src/components/logistics/WaybillDialog.tsx` — standalone waybill creator.
- `src/components/logistics/DeliveryNoteDialog.tsx`.
- `src/components/procurement/PurchaseOrderDialog.tsx` + `src/lib/generatePurchaseOrder.ts`.
- `src/components/finance/RecordPaymentDialog.tsx` + `src/lib/generateReceipt.ts`.
- `src/lib/generatePayslip.ts`, `src/lib/generateClaimVoucher.ts`, `src/lib/generateFieldReportPdf.ts`, `src/lib/generateDeliveryNote.ts`.
- `src/components/HelpSheet.tsx` — slide-out cheat sheet, mounted in `AppLayout`.
- `src/pages/DocumentRegistry.tsx` (admin-only, linked from Settings).
- `supabase/migrations/<ts>_document_numbering.sql` — ensure `document_number` column + `auto_assign_doc_number` trigger on every doc table; backfill existing rows.

**Files to edit**

- `src/pages/Logistics.tsx` — "+ New Waybill" / "+ New Delivery Note" header buttons, empty-state CTAs.
- `src/pages/Procurement.tsx` — "+ New PO" + Generate PDF action.
- `src/pages/Finance.tsx` — "Record Payment" row action on invoices → Receipt PDF; bulk actions.
- `src/pages/HR.tsx` — "Generate ID Card" + "Download Payslip" row actions in respective tabs.
- `src/pages/WorkerClaims.tsx` — "Print Voucher" on approved claims.
- `src/pages/FieldReports.tsx` — "Download PDF" per report.
- `src/components/CommandPalette.tsx` — add all new document creators.
- `src/components/dashboards/*Dashboard.tsx` — role-scoped Quick Actions row.
- `src/lib/generatePdf.ts` — unified header/footer, draft watermark, print-preview helper.
- `src/lib/navConfig.ts` — surface Document Registry (admin) and Procurement (where missing).
- `src/components/layout/RoleBasedOnboarding.tsx` — add 4-step tour per role.

**Numbering prefixes** added to a new `src/lib/docPrefixes.ts` constant so client and server agree.

---

## Open question

One quick check before I start: do you want the **Document Registry** (searchable list of every doc number ever issued) visible to **Admin only**, or also to **Accounts/Finance**? Default I'll use is Admin + Accounts. Let it be visible to any one that needs it 