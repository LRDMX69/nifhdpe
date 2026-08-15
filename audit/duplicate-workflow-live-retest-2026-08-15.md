# Duplicate workflow cleanup live retest — 2026-08-15

## Production target

`https://nifhdpe.vercel.app`

## Results after PR #17 merge

The live sidebar now shows **Finance** as the only Accounts entry for the financial workspace. The former duplicate **Invoices** sidebar entry is gone. Procurement and Analytics remain separate Accounts modules.

Opening `/finance` shows the Finance page with its internal tabs: Overview, Invoices, Receipts, Expenses, Payments, and Bank Analysis. Selecting the Invoices tab updates the URL to `/finance?tab=invoices`, loads the existing UAT invoice, and preserves the invoice table and PDF controls.

The Finance page’s **New Invoice** action still opens the complete invoice creation dialog, including client/source lineage, invoice lines, delivery/tax context, and payment/account context. The **Log Payment** action still opens the connected worker-payment dialog without creating data. The existing direct deep link `/finance?tab=invoices` remains valid because the tab is owned by Finance rather than by a separate page.

## Verdict

The duplicate navigation was consolidated without removing any business workflow. Finance is now the canonical Accounts entry; invoice creation, invoice review, PDF download, and payment recording remain available within their authoritative Finance context.
