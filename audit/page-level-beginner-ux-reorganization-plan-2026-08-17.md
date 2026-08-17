# Plan: Reorganize Every ERP Page for Beginner-First UX

## Goal

Rework the arrangement, layout hierarchy, and interaction flow of every authenticated NIFHDPE ERP page so a first-time user can understand what the page is for, identify the next action, and reach the correct workflow without training. Preserve the existing company colors, typography, visual identity, feature coverage, permissions, live data connections, database architecture, and document behavior. This is a UX-structure correction, not a visual rebrand or feature expansion.

## Clarified design direction

The current color palette and general styling remain unchanged. The work will focus on **information order, density, grouping, navigation, disclosure, action placement, and responsive behavior**. Each page should follow a proportionate version of this hierarchy:

1. **Orientation:** a clear page title, plain-language purpose, and live context where available.
2. **Next actions:** two to four obvious actions using familiar labels and existing routes, tabs, dialogs, or focus targets.
3. **Compact live snapshot:** only the metrics needed to orient the user, with no fabricated or placeholder values.
4. **Primary work area:** the list, form, register, or queue the user came to use.
5. **Secondary detail:** charts, AI explanations, extended metadata, workflow education, exports, and advanced controls behind calm, explicit disclosure when they compete with the main task.
6. **Escape and connected work:** every detail page retains a clear back/return path and links to the adjacent workflow that naturally follows it.

Simple pages such as calculators, document registries, and settings will receive a lighter version of this pattern rather than being forced into dashboard-like card density.

## Parallel research and audit streams

The implementation will begin with parallel read-only streams:

| Stream | Scope | Output |
|---|---|---|
| Route and role matrix | Map every route, role restriction, tab, dialog, detail view, and empty state from `src/App.tsx`, `DashboardRouter`, and page components. | Complete page-by-page coverage matrix and role-scope risks. |
| Beginner task-flow audit | For each page, identify the likely first question, primary job, next action, confusing competing actions, and buried connected workflow. | Page-specific rearrangement brief. |
| Responsive layout audit | Check mobile and desktop containers, horizontal overflow risks, dense tables, tab strips, fixed controls, and modal entry points. | Responsive correction list using 390×844 and desktop spot checks. |
| Architecture and connectivity audit | Verify that proposed actions reuse existing routes, controlled tabs, dialogs, queries, mutations, invalidations, and document persistence rather than adding duplicate pages. | Safe implementation boundaries and integration checklist. |
| Production-safety audit | Confirm all QA remains read-only against the cleared database and exclude test records, mutations, simulated values, and environment-file changes. | No-mutation verification protocol. |

The requested `/similarweb-analytics` capability is not directly relevant to an authenticated internal ERP’s page arrangement; no traffic-based design decision will be made from SimilarWeb data. If the intent was a separate competitor or public-site traffic study, that would be a distinct research phase and is not assumed here.

## Implementation phases

### Phase 1 — Establish the page-level UX contract

Review the current shared primitives and existing page changes, then define one reusable page-shell vocabulary for orientation, task actions, compact summaries, primary content, and secondary disclosure. Preserve the current color tokens and typography. Establish accessibility requirements for visible labels, keyboard reachability, focus states, and screen-reader order.

### Phase 2 — Reorganize the core daily-work pages

Refactor the pages most likely to be used daily in coherent batches: dashboard role views, Clients, Opportunities, Quotations, Projects, Finance, Inventory, Logistics, Procurement, Field Reports, HSE, Equipment, and HR. On each page, keep the primary job above supporting intelligence, use existing feature entry points, and reduce competing top-level controls. Preserve all existing live queries, mutations, tab semantics, document generation, and cross-module invalidation.

### Phase 3 — Reorganize supporting and reference pages

Apply proportionate layouts to Analytics, Document Registry, Compliance, Worker Claims, Messages, Settings, BOQ, Pipe Calculator, and any remaining authenticated operational routes. Ensure empty production states are still useful: they should explain what the page is for and expose the correct first action without inventing records or metrics.

### Phase 4 — Remove UX duplication and buried workflows

Review the complete diff and rendered page matrix for duplicate entry points, misleading labels, generic actions that do not perform a real operation, tabs that cannot be reached from the first-use area, and secondary panels that still dominate the viewport. Keep only one natural entry point per job while retaining necessary header actions for experienced users.

### Phase 5 — Read-only verification

Run local typecheck, production build, tests, and diff hygiene. Use the maintenance preview or the current authenticated QA session to inspect every role and every page without creating, editing, deleting, approving, printing, submitting, or syncing business records. Verify at 390×844 that task actions appear before dense content and `documentElement.scrollWidth` equals the viewport width. Add desktop checks for representative high-density pages. Capture console errors and distinguish existing browser/realtime noise from regressions.

### Phase 6 — Release and live propagation check

Commit only the intended page, shared-layout, and audit files. Push to `main`, monitor CI’s TypeScript, lint, tests, build, dependency, production-marker, and diff-hygiene checks, and confirm the working tree is clean. Recheck the public production alias after deployment propagation. If the partner-hosted Vercel alias still serves an earlier asset manifest, document that propagation/access limitation separately rather than claiming the new UX is live.

## Acceptance criteria

| Area | Acceptance condition |
|---|---|
| Beginner clarity | A new user can identify the page purpose and the next action without relying on hidden knowledge or AI explanations. |
| Arrangement | Orientation and primary actions precede dense tables, charts, AI panels, and extended metadata. |
| Brand preservation | Existing colors, typography, semantic tokens, and company identity remain unchanged unless a contrast/accessibility defect is discovered. |
| Connectivity | Actions point to real routes, controlled tabs, existing dialogs, or real focus targets; no duplicate feature pages are introduced. |
| Data integrity | Every displayed metric remains source-derived; no mocks, simulations, TODO-driven placeholders, or fake records are added. |
| Role safety | Role-scoped navigation and actions remain unchanged and are verified in the maintenance preview. |
| Responsiveness | No horizontal overflow at 390×844; tables and tabs remain usable through existing responsive patterns. |
| Functionality | Existing create/edit/delete/approve/print/document and cross-module reactions remain connected and compile-tested. |
| Production safety | All verification is read-only because the production database is cleared for today’s use. |
| Release quality | Local quality gate passes, CI succeeds, the pushed commit is clean, and live alias status is explicitly reported. |

## Assumptions and open risks

The existing application architecture, route registry, Supabase schema, and current live connections are retained. No database migration is expected for a layout-only change. The largest risks are accidental duplication of existing actions, unstable controlled-tab state, runtime loops caused by unstable query defaults, and partner-hosted deployment propagation lag. These risks will be handled with page-specific read-only checks, console review, and CI before release.

## Execution finding — current implementation review

The route registry contains 20 authenticated operational pages plus the dashboard, settings, and protected system routes. All operational pages currently include `PageTaskStart`, but the primitive itself renders a full bordered Card with a title, description, and multiple nested action cards. This means the previous batch achieved action visibility but may still be too card-heavy and may not satisfy the clarified request for simple arrangement. The next implementation pass should treat `PageTaskStart` as a layout aid, not a mandatory visual block: where the page already has a natural primary control, actions should become a compact inline action bar or a clearly ordered toolbar, and the primary content should move upward rather than stacking another large panel above it.

## Browser verification checkpoint — clarified Clients arrangement

At `390×844`, the current Clients page now renders in the intended order: PageHeader orientation at the top, a compact task section immediately below it, the collapsed `How this works` explanation after the task section, then CRM intelligence and the live client search/list. The task section uses the existing brand colors and tokens but no longer appears as a large standalone card. The snapshot showed all visible content contained within the 390px page shell.

## Browser verification checkpoint — clarified Finance arrangement

At `390×844`, Finance now renders its orientation/header and compact `Start with money in and money out` action section before the collapsed `How money moves through this page` explanation, live KPI cards, and the detailed tabs. The current page snapshot showed the task section contained within the 390px shell and no new color or typography treatment.

## Implementation update — clarified arrangement pass

The shared task primitive was simplified from a full Card-within-page to a compact semantic section with the existing brand tokens, smaller action rows, and two-line descriptions. All pages continue to use the same colors and typography. The actual JSX order was normalized so the operational pages with workflow explanations now follow orientation → primary actions → collapsed `How this works` explanation → live snapshot or primary work area. High-density Finance and Clients pages were checked at `390×844` and showed the corrected order with no new overflow.

The current source audit confirms the action section precedes the workflow banner on App Settings, Clients, Compliance, Document Registry, Equipment, Field Reports, Finance, HR, Inventory, Logistics, Messages, Opportunities, Procurement, Projects, and Quotations. BOQ, HSE, Analytics, and Pipe Calculator use the proportionate task-first structure without a competing workflow banner.

## Browser verification checkpoint — clarified Projects arrangement

At `390×844`, Projects now renders the page orientation and live summary, then the compact project-execution actions, then the collapsed `How projects flow` explanation, followed by the actual project search/filter and empty state. The snapshot showed the primary actions and project content contained within the mobile page shell; no project record was created or changed.

## Live production verification

After GitHub reauthentication, commit `cf363dc` was pushed successfully and the associated CI run `32050335233` completed with `success`. The public alias `https://nifhdpe.vercel.app/clients` was then checked read-only. It contains the updated `Start with your client directory` section, the compact Add/Find/Open Quotations actions, and the collapsed `How this works` content in the intended order. No production record was created, edited, deleted, or otherwise mutated.
