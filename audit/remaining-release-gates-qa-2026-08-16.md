# Remaining release-gates QA evidence — 16 August 2026

## Quotation editing and printing — PASS for observed UAT record

URL: https://nifhdpe.vercel.app/quotations?qa=remaining-gates-document-edit

The live quotation row exposed Edit, Download PDF, Revision History, status controls, and Delete in its action menu. Edit opened a complete controlled form with reason-for-change, Itemized/Lump Sum tabs, client/opportunity/pipe type selectors, profit margin, line-item product/type/quantity/unit price, labor, transport, discount, overhead/site cost, tax, site/project reference, payment terms, assumptions, exclusions, terms, calculated subtotal/labor/transport/profit/grand total, Save Draft, Save & Send, Cancel, and Close. Cancel closed without mutation. Download PDF generated `quotation-quotations_2026_0001-QUOTATIONS_2026_0001 (1).pdf`.

Fresh visual inspection found a one-page branded quotation with NIF header/contact block, DRAFT watermark, item table, totals panel, signature lines, footer identifier, and Page 1 of 1. The artifact is legible, proportionate, and suitable for routine quotation issuance for this content size. The wider document gate remains open for other document classes and the previously observed receipt page-fit warning.

## Purchase-order printing and visual inspection — generation PASS; metadata warning

Procurement Purchase Orders generated `purchase-order-purchase_orders_2026_0002-DOC-MSW11H00.pdf`. The artifact is one page, branded, legible, proportionate, and includes a DRAFT watermark, item table, quantity 2, unit price ₦15,000, total ₦30,000, Grand Total, prepared/approved/date signature lines, and Page 1 of 1. However, the captured page does not visibly present a clear PO number/title or vendor metadata block in the body; the footer contains only `DOC-MSW11H00`. This is a material everyday-use/document-quality warning because a printed PO should identify its vendor and reference without relying on application context. Full PDF certification remains open pending correction or explicit confirmation that the source-specific header is intentionally omitted.

## PO form and metadata follow-up — PASS for controlled form; PDF metadata present in text layer

The New PO form rendered vendor selection, Local/Import/Forex/Open market procurement mode, vendor invoice number, accounting folio, site/project reference, VAT amount, haulage cost, amount paid, repeatable order lines, item name, description/specification, quantity, unit, unit price, line total, PO total, Create PO, Add line, and Close. The form was opened without submission. The empty default line showed PO total ₦0 and the source validation requires a vendor and valid positive line values.

Text extraction from `purchase-order-purchase_orders_2026_0002-DOC-MSW11H00.pdf` confirms the PDF contains `DOCUMENT ID DOC-MSW11H00`, `PURCHASE ORDER PURCHASE_ORDERS/2026/0002`, `Vendor`, `UAT Supplier HDPE 2026-08-15`, status, currency, date, line data, and Grand Total. The visual artifact remains sparse and the metadata hierarchy is weak at normal viewing scale, but the information is present in the text layer; classify as layout-quality warning rather than missing-data defect.
Fresh receipt regression: RECEIPTS/2026/0002 generated from invoice INVOICES/2026/0001C with Amount Received NGN 100.00, Payment Date 2026-08-16, Outstanding Balance NGN 0.00, finance stamp, and complete text metadata. pdfinfo reports 2 pages on A5 (419.53 x 595.28 pt); page 2 contains only signature lines and finance stamp, so the compact receipt fix is insufficient. The Finance list immediately after payment still displayed INVOICES/2026/0001C as draft with Balance NGN 100.00, while the receipt was issued; this requires retesting/diagnosis because payment and invoice status may not be propagating for draft invoices.

## Payment receipt live retest — one-page and header PASS; stamp overlap remains

After CI run 31960072667 passed and the deployment updated, the controlled UAT workflow issued `RECEIPTS/2026/0004` against `INVOICES/2026/0001E` for NGN 100.00. `pdfinfo` verified one page on A5 (419.53 x 595.28 pt), and `pdftotext` verified the receipt number, invoice, client, amount, payment method/date, zero outstanding balance, acknowledgement, finance verification stamp, and Page 1 of 1. Visual inspection confirmed the document ID/issued metadata no longer collides with the letterhead contact strip. However, the finance approval stamp still sits over the final acknowledgement line; this is a remaining compact-receipt layout defect and must be corrected before marking the PDF gate PASS.

## Payment receipt live retest — PASS

After CI run 31960260100 passed and the approval-badge change reached production, the controlled UAT workflow issued `RECEIPTS/2026/0005` against `INVOICES/2026/0001F` for NGN 100.00. `pdfinfo` verified one page on A5 (419.53 x 595.28 pt); `pdftotext` verified the receipt number, invoice, client, amount, payment method/date, zero outstanding balance, acknowledgement, Finance Verified badge, and Page 1 of 1. Visual inspection confirmed the document metadata is below the letterhead, the Finance Verified badge is readable within the title panel, the acknowledgement is unobstructed, and the receipt is proportionate and printable. This receipt-layout gate now passes for the observed UAT flow.

## Field report PDF coverage — conditional / open defect

Live Field Reports opened two existing records. The detail view exposed raw notes, a site-photo attachment, a Print action, discussion input, and Close. Printing `report_-general-—-2026-05-29-DOC-MSW209HR.pdf` produced one branded A4 page with a clear report title, sender department, raw note text, routing line, signature lines, company seal, footer, and Page 1 of 1. The PDF is readable and proportionate, but the source report stated `Report is being processed` and the attached site photo was not embedded in the printed artifact; the attachment was visible only in the modal. This remains open for complete field-report document certification and requires inspection of the print caller/structured-report readiness behavior.

## Field report PDF attachment retest — PASS for PDF coverage; structured-state warning retained

After CI run 31960566962 passed, the live Print action returned the success notification `The report details and site-photo attachments were included.` The fresh artifact `report_-general-—-2026-05-29-DOC-MSW2505K.pdf` is one branded A4 page. `pdfimages -list` confirmed an embedded 1055 × 1491 RGB image object, and extraction confirmed the attached image content survived PDF embedding. `pdftotext` contains the report details, `Site Photo 1`, footer identifier, and Page 1 of 1. The photo source itself is a mostly white UAT image with the company header, so the sparse visual appearance reflects the supplied attachment rather than a missing-image renderer defect. The PDF attachment-coverage gate passes for this observed flow. The underlying report still displays `Report is being processed` with no structured report; retain that as a separate data-processing completeness warning.
