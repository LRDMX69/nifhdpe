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

## Equipment allocation-sheet PDF retest — PASS

After CI run 31960830811 passed, the live UAT Equipment page retained `UAT Fusion Machine BF-315 2026-08-16` with status available, Fusion Machine type, serial `UAT-BF315-20260816`, 12 usage hours, and maintenance date 2026-12-31. The corrected `equipment-allocation-sheet-DOC-MSW2BJOD.pdf` is one A5 page (419.53 × 595.28 pt). Text extraction contains the document ID, allocation-sheet title, dispatcher/department, all equipment columns and values, Prepared By/Approved By/Date lines, and Page 1 of 1. Visual inspection confirms the table and approval lines fit cleanly on the same page without clipping. The equipment document gate passes for this observed flow.

## BOQ PDF coverage and layout — PASS

The BOQ route initially had no export action; the UAT detail editor correctly calculated 10 m × NGN 2,500.00 = NGN 25,000.00 but exposed only Back/status/line-item controls. A native Download PDF action was added using the shared renderer, with explicit A4 sizing for the seven-column table and corrected newline handling. After CI run 31961407225 passed, the live UAT detail generated `bill-of-quantities-—-uat-boq-hdpe-qa-2026-08-16-DOC-MSW2QRL3.pdf`. `pdfinfo` verified one A4 page (595.28 × 841.89 pt); text extraction verified the title, BOQ summary, DRAFT status, UAT code/description, quantity 10, unit m, rate NGN 2,500.00, amount and BOQ total NGN 25,000.00, approval lines, and Page 1 of 1. Literal `\\n` text is absent. Visual inspection confirms the table, total box, and approvals are readable and unclipped. The BOQ document gate passes.

## Opportunities pipeline PDF — PASS for observed full-pipeline export

The live Opportunities route initially showed a transient zero-record state, then settled to 643 live opportunities with pipeline value NGN 2,535,510,000,000.00. The Print action generated `opportunities-DOC-MSW2RT9N.pdf` (document ID from the footer). The artifact is 61 pages and the extracted text spans the pipeline records through the final pages, with Page 1 of 61 and continuous table headers/page footers. Visual inspection of page 1 confirms the branded letterhead, readable five-column opportunity table, full titles/sources/status/value/deadline data, and proportionate table layout. The Opportunities pipeline document gate passes for the observed full-pipeline export; the transient initial zero state remains a performance/loading observation, not an export defect.

## Confirmed-order delivery lifecycle — reservation retest findings

The first controlled UAT quotation `QUOTATIONS/2026/0001` was accepted and converted to `SALES_ORDERS/2026/0001`, but its free-text/unlinked line correctly produced the live Logistics error `Could not create delivery — No reserved inventory is available for this order` at `https://nifhdpe.vercel.app/logistics?qa=confirmed-order-delivery-lifecycle-2026-08-16&order=SALES_ORDERS%2F2026%2F0001`. The Inventory table already has the live `product_specification_id` connector from migration `20260813100000_complete_transaction_connectors.sql`; the UI did not expose it.

A controlled `UAT-PE100-110-SDR11 · UAT HDPE Pipe 110mm SDR11` catalogue record was added and the existing 8-unit UAT inventory SKU was linked to it through the newly deployed Inventory selector. A second quotation `QUOTATIONS/2026/0002` was then created with the catalogue item, sent, accepted, converted to `SALES_ORDERS/2026/0001B`, and confirmed. Confirmation reported success, but the live delivery attempt at `https://nifhdpe.vercel.app/logistics?qa=confirmed-order-delivery-linked-rerun-2026-08-16&order=SALES_ORDERS%2F2026%2F0001B` again returned `No reserved inventory is available for this order`.

Source diagnosis: in `src/pages/Quotations.tsx`, the product selector called `updateItem` twice in one event. Because `updateItem` used the closed-over `items` array, the second description update overwrote the first `productSpecificationId` update. The selector therefore visually reverted to `Free-text / unlinked`, even though it autofilled the product description, and `create_sales_order_from_quotation` copied a null specification ID. Fixing the updater to use a functional state transition is required before the third lifecycle rerun.

EOF
