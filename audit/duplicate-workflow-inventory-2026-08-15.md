# Duplicate workflow inventory — 2026-08-15

## Verified production PDF

The merged invoice PDF is now one page, A4, and complete. The latest artifact is `invoice-invoices_2026_0001-INVOICES_2026_0001 (4).pdf`. It contains one line item, the NGN-safe table headers, all totals, signature lines, finance stamp, and `Page 1 of 1`.

## Duplicate or overlapping ERP work paths

| Surface | Current behavior | Classification | Recommended ownership |
|---|---|---|---|
| Sidebar `Finance` and sidebar `Invoices` | Both point to the same `/finance` page; `Invoices` only adds `?tab=invoices`. The Finance page itself owns the Invoices tab and invoice actions. | True navigation duplicate, not two data workflows. | Keep `Finance` as the canonical Accounts entry; expose invoice context through the Finance tabs and preserve the deep link for bookmarks. |
| Command palette `Finance`, `Invoices`, and `New Invoice` | `Finance` and `Invoices` are both navigation choices to the same page; `New Invoice` is a useful action shortcut. | Navigation duplicate plus legitimate create action. | Remove only the duplicate `Invoices` destination from the general “Go to” list; keep `New Invoice`. |
| Finance page `New Invoice` buttons | Header action and invoice-tab action both open the same invoice workflow. | Intentional contextual shortcut, not duplicate business logic. | Keep both because one is page-level and one is table-contextual. |
| HR Connected operations commercial panel | Read-only summary of clients, quotations, invoices, and deliveries; links back to owning modules and creates no parallel records. | Intentional oversight view, not duplicate ownership. | Keep, but label it clearly as read-only oversight. |
| HR finance and Finance module | HR finance workspace owns HR schedules, loans, HMO, VAT, and approvals; Finance owns general finance, invoices, receipts, expenses, payments, and bank analysis. | Adjacent connected workflows, not duplicates. | Keep separate ownership and maintain links/query invalidation. |
| `/operations` and `/product-specifications` | Legacy bookmarks redirect to canonical destinations and do not render standalone duplicate pages. | Correct compatibility aliases. | Keep redirects. |
| Mobile bottom navigation versus sidebar | Same routes are offered in different responsive navigation surfaces, role-filtered. | Intentional responsive duplication of navigation chrome. | Keep; do not expose the same route twice within one surface. |

## First consolidation target

The clearest user-facing duplicate is the sidebar `Invoices` item alongside `Finance`, because both open the same Finance page and the page already has an Invoices tab. The safest cleanup is to remove the sidebar-only duplicate while preserving `/finance?tab=invoices` as a bookmark/deep-link target and keeping the Finance page’s invoice tab, actions, and command-palette create shortcut.
