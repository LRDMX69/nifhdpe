# NIFHDPE page-level UX inventory — 2026-08-17

## Scope

This pass extends the beginner-first layout treatment from the role dashboards to the operational pages inside the authenticated ERP shell. The existing `AppLayout` already provides the responsive sidebar/mobile navigation, a bounded main content area, help access, command palette, guided-tour surface, and feedback control. The page-level work should therefore improve hierarchy inside each route rather than create new shells or duplicate modules.

Authentication and system-state pages (`/login`, `/reset-password`, `/pending-approval`, `/404`) are outside the operational dashboard hierarchy. The authenticated operational routes are the pages listed below.

## Route inventory and first-use intent

| Route | Component | Primary user question | First-use action or decision | Secondary detail to collapse or defer |
| --- | --- | --- | --- | --- |
| `/quotations` | `Quotations.tsx` | What quote should I create, review, or convert? | Start a quotation, search/filter existing quotes, or open the relevant quote section | Product/specification detail, large tables, print/export detail |
| `/clients` | `Clients.tsx` | Which client or contact do I need to manage? | Find a client or add a client | CRM AI suggestions and dense client metadata |
| `/opportunities` | `Opportunities.tsx` | Which opportunity needs follow-up next? | Review pipeline, filter stage, or create/update an opportunity | Opportunity brief/AI detail and extended card metadata |
| `/projects` | `Projects.tsx` | What project needs execution attention? | Open a project, create a project, or filter active work | Full project financial/technical detail and long activity sections |
| `/field-reports` | `FieldReports.tsx` | What happened on site today? | Submit a report or review reports needing attention | AI processing, raw submission, generated structured report, print view |
| `/hse` | `HSE.tsx` | What safety issue must be addressed? | Record/review a safety observation, incident, or inspection | Historical charts, extended records, and evidence detail |
| `/equipment` | `Equipment.tsx` | Which equipment is available, due, or requested? | Find equipment, submit a request, or review approval queue | Maintenance history, request escalation detail, extended equipment metadata |
| `/inventory` | `Inventory.tsx` | What stock is available, reserved, or low? | Search stock, review low-stock items, or record the relevant stock movement | Full movement history, specification detail, and large inventory tables |
| `/logistics` | `Logistics.tsx` | Which delivery is being planned or delayed? | Create/review a delivery and inspect its status | Waybill/dispatch detail, route information, and historical shipment detail |
| `/procurement` | `Procurement.tsx` | Which purchase needs action or approval? | Review requisitions/orders or create the next purchase request | Vendor comparisons, extended order lines, and analytics |
| `/finance` | `Finance.tsx` | What money came in, went out, or needs reconciliation? | Review invoices, log payment, or log expense | Large invoice/payment tables, bank-link detail, and AI insights |
| `/analytics` | `Analytics.tsx` | What business trend needs a decision? | Choose the decision area and read the most relevant live summary | Secondary charts and low-priority visualizations |
| `/hr` | `HR.tsx` | Which people or people-process needs attention? | Review attendance, leave, payroll, or the HR command center | Connected finance detail, charts, and extended people records |
| `/claims` | `WorkerClaims.tsx` | Which worker claim needs review or submission? | Submit/review a claim and inspect its status | Extended claim evidence and history |
| `/messages` | `Messages.tsx` | Which conversation or request needs a reply? | Open unread/assigned conversations and respond | Search, metadata, and long message history |
| `/documents` | `DocumentRegistry.tsx` | Which issued document must I find or reprint? | Search/filter the registry, open a record, or reprint | Extended document metadata and CSV export controls |
| `/compliance` | `Compliance.tsx` | Which certificate or inspection is expiring or missing? | Add/review a compliance record and filter status | Full certificate metadata and historical detail |
| `/boq` | `BOQ.tsx` | Which bill of quantities needs estimating? | Create/open a BOQ and add the next item | Item-level calculations, export controls, and long line-item tables |
| `/calculator` | `PipeCalculator.tsx` | What engineering calculation do I need to run? | Choose the calculation and enter the minimum required inputs | Formula explanation and extended result context |
| `/settings` | `AppSettings.tsx` | Which organization, team, profile, or policy setting must I change? | Choose the settings area, then make the clearly scoped change | Policy approval queues, destructive account actions, and dense team tables |

## Existing architecture observations

All major operational pages already use `PageHeader`, which is the correct shared orientation primitive. Most pages place their action buttons in the header and then immediately render their full data surface. The page-level improvement should preserve the existing data hooks and mutations while making the first visible section a concise task strip or action group, followed by a small live snapshot and then the main records. High-density tables, AI panels, print layouts, extended metadata, and historical charts should be deliberately secondary where the existing page has enough content to compete with the first action.

The existing `RoleQuickStart` component is intentionally role-specific and should remain dashboard-oriented. Page-level actions should use a separate shared primitive or a small extension with neutral wording such as `PageTaskStart`, rather than incorrectly showing role dashboard actions on every page. The implementation must keep links connected to existing routes, existing tabs, and existing mutation handlers.

## Refactor batches

The first batch should cover the most frequent operational flow: quotations, opportunities, clients, projects, inventory, logistics, procurement, finance, and documents. The second batch should cover field execution and people workflows: field reports, HSE, equipment, HR, messages, claims, and compliance. The third batch should cover decision/reference/configuration pages: analytics, BOQ, calculator, and settings. Authentication and system-state pages should only receive targeted responsive or clarity fixes if the inventory phase finds a concrete issue; they should not be forced into the operational-page hierarchy.

## Constraints for implementation and QA

The database is cleared for production use. No new records, test mutations, approvals, attendance actions, submissions, payments, exports that write state, or destructive actions may be performed. All page metrics must continue to derive from live source queries. Existing role scoping, route guards, document persistence, and cross-page invalidation behavior must remain intact. Every refactored page must be checked at 390×844 and desktop widths for horizontal containment and familiar first-click navigation.

## Implementation update — page-level hierarchy

The shared page primitives are now in `src/components/layout/PageTaskStart.tsx` and `src/components/layout/PageSecondaryDisclosure.tsx`. Every authenticated operational page in the inventory that uses `PageHeader` now also exposes a compact first-use task start: Quotations, Clients, Opportunities, Projects, Field Reports, HSE, Equipment, Inventory, Logistics, Procurement, Finance, Analytics, HR, Worker Claims, Messages, Document Registry, Compliance, BOQ, Pipe Calculator, and App Settings.

The task panels use existing route links, existing tab state, existing focus targets, or existing mutation handlers. They do not create duplicate modules, alter role permissions, or add database records. Secondary AI, catalogue, and chart detail is collapsed where it competed with the primary workflow. Live executive summaries, KPI values, queries, invalidations, document persistence, and cross-module links were left intact.

Local validation completed for this batch: `npm run typecheck`, `npm run build`, `npm test -- --run`, and `git diff --check` all passed. The test suite reported 26 passing tests across 5 files. Production data remained read-only throughout implementation and validation.

## Final implementation and QA update

The route-level BOQ list state was corrected after responsive QA showed that an empty production dataset bypassed the detail task panel. The BOQ list now leads with quantity-estimating actions and connects to Projects and Pipe Calculator; the opened detail state retains line-item focus and project/calculator context.

Responsive QA also exposed an existing Procurement effect that repeatedly replaced GRN line-item state when the query returned a fresh empty-array reference. The synchronization is now idempotent, preventing a maximum-update-depth loop without changing the GRN workflow or writing data. After reload, only non-layout browser noise remained: notification permission requested outside a user gesture and an invalid Cloudflare cookie on the Supabase realtime websocket.

The final local quality gate passed after these fixes: `npm run typecheck`, `npm run build`, `npm test -- --run`, and `git diff --check`. The test suite reported 26 passing tests across 5 files. Page-level mobile QA used a 390×844 read-only session; no business records were created, edited, deleted, submitted, approved, printed, or otherwise mutated.
