# Production PDF audit — 2026-08-15

## Artifact

Latest production download: `invoice-invoices_2026_0001-INVOICES_2026_0001 (3).pdf`

## Current result

The invoice is A4 and uses NGN-safe headers, but it remains **two pages** for one line item. `pdfinfo` reports 595.28 x 841.89 points, A4, two pages. `pdftotext -layout` confirms the narrative now contains only the concise line-item reference and does not duplicate the financial totals.

## Visual defect

Page 1 contains the letterhead, large unused watermark area, narrative content, and a one-row line-item table near the lower half. Page 2 contains the entire totals summary, signature lines, and finance stamp. This is not an acceptable compact invoice layout because the totals and approvals are separated from the only line item and page 2 is mostly empty.

## Root-cause direction

The shared renderer uses a wide A4 margin and reserves the full detailed-document bottom area. `autoTable` is allowed to paginate before the summary is placed, then the summary and signature block are drawn after the table. The summary is therefore pushed onto a new page even though the invoice is short. The next fix must treat a short invoice with a small line-item table as compact, keep the table, totals, signatures, and stamp together, and avoid forcing the detailed A4 content top/bottom reserves for this artifact.

## Content verified

The artifact contains one line item, NGN-safe headers (`Price (NGN )`, `Total (NGN )`), subtotal, discount, overhead/site cost, transportation, tax, gross total, net due, balance due, signature lines, and finance stamp. The content is complete; the remaining blocker is professional pagination and composition.
