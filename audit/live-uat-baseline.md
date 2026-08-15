# Live UAT Baseline

**Target:** https://nifhdpe.vercel.app/dashboard  
**Observed:** 15 August 2026  
**Session:** Authenticated administrator session displayed as `Ola` / Administrator in the sandbox browser.

## Initial results

The deployed application loads to the dashboard without a blank screen or infinite-loading state after the initial shell wait. The authenticated navigation exposes Dashboard, Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, Opportunities, Quotations, Clients, Inventory, Logistics, Finance, Invoices, Procurement, Analytics, HR, Claims, Messages, Documents, and Settings.

The dashboard renders executive cards, financial chart, critical alerts, AI intelligence, overdue invoices, 30-day cashflow, risk projects, field reports, and action controls. Current visible data includes 643 opportunities, zero-value finance/project/claims cards, and AI intelligence entries dated June 2026. This is an observed live state, not a correctness certification.

## Immediate verification boundaries

The sandbox browser is already authenticated as an administrator. Other roles have not yet been independently tested. Live database mutations have not yet been performed during this UAT pass. The current viewport appears desktop-sized; tablet and mobile observations remain pending.

## Route inventory from live navigation

`/dashboard`, `/projects`, `/equipment`, `/field-reports`, `/hse`, `/compliance`, `/calculator`, `/boq`, `/opportunities`, `/quotations`, `/clients`, `/inventory`, `/logistics`, `/finance`, `/finance?tab=invoices`, `/procurement`, `/analytics`, `/hr`, `/claims`, `/messages`, `/documents`, `/settings`.
