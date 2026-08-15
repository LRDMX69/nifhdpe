# NIFHDPE Wide Audit — Repository Baseline

**Audit branch:** `feat/invoice-waybill-reactive-workflows`  
**Audit date:** 15 August 2026  
**Repository:** `LRDMX69/nifhdpe`

## Current repository shape

The application is a React 18, Vite 6, TypeScript, Tailwind, Supabase, TanStack Query, React Router, jsPDF, Recharts, and Vitest ERP. The current branch contains 72 Supabase migration files, one GitHub Actions workflow, five test files plus setup, and 24 primary pages covering commercial, finance, HR, logistics, procurement, inventory, projects, field operations, compliance, analytics, messaging, and administration.

Important primary pages include `Clients`, `Opportunities`, `Quotations`, `Finance`, `Procurement`, `Inventory`, `Logistics`, `DocumentRegistry`, `HR`, `Analytics`, `Projects`, `BOQ`, `WorkerClaims`, `HSE`, `FieldReports`, `Equipment`, and `Compliance`. Component groups exist for finance, HR, logistics, quotations, clients, projects, dashboards, messaging, and shared UI.

## Existing quality infrastructure

The repository has `.github/workflows/ci.yml`, which runs standard and strict TypeScript checks, ESLint, the Vitest suite, production build, high-severity dependency audit, diff hygiene, and a production-marker audit on pushes, pull requests to `main`, and manual dispatch. The current behavior suite includes tests for financial calculations, payroll calculations, offline queue errors, print cleaning, and a basic example test.

## Relevant recent architecture additions

The branch includes `20260815100000_hr_finance_workflow_connectors.sql`, which adds HR/Finance workflow connectors, bank analysis tables and RPCs, VAT schedule persistence, approvals, loan/payroll payment lineage, and expense normalization. It also includes `20260815130000_invoice_waybill_reactive_workflows.sql`, which adds client-aware document series, complete invoice creation/payment normalization, durable waybills, delivery linkage, print/reprint lifecycle RPCs, and document-registry integration.

## Audit constraints

The live Lovable Cloud/Supabase migration state, regenerated production types, authenticated RLS behavior, and end-to-end production data behavior cannot be assumed from source inspection or local tests. Every later conclusion must distinguish static evidence, deterministic local behavior tests, and live behavior that remains unverified.

## Initial audit questions

The broad audit must trace each business lifecycle as an entity/state graph rather than as pages: client → opportunity → quotation → proforma → sales order → invoice → payment → receipt → outstanding balance → reporting; supplier/request → quotation/price → purchase order → receiving → stock → supplier invoice → payment → bank analysis; expense → account/payment → bank analysis → reconciliation/reporting; loan → approval → schedule → payroll deduction → payment → balance; VAT source → calculation → schedule → payment/withholding → reporting; leave and discipline review/decision flows; delivery → waybill → registry → reprint; and editing/cancellation/revision propagation across all financial and operational entities.
