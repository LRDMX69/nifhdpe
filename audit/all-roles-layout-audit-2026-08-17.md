# All-Role Dashboard Layout Audit — 17 August 2026

## Scope and constraint

This audit applies the same beginner-first layout standard used for the HR dashboard to every role preview in the maintenance dashboard: Administrator, Technical Dept., Logistics, Accounts, HR, Marketing, Knowledge Manager, and Trainee Dept. The live database was cleared for operational use before this audit. No records are being created, edited, approved, rejected, or deleted; all verification is read-only and uses the current empty-data state.

## Live role matrix baseline

At the deployed dashboard, the maintenance preview successfully switched through all eight canonical role labels at a 1280×800 viewport. Each role rendered without horizontal overflow. The current shared structure is a role switcher, a `Start here` responsibility banner, a shared `RoleQuickStart` card block, an optional `Needs Your Attention` card, and then the role-specific dashboard. This creates a repeated dashboard-inside-dashboard pattern for most roles.

| Role | Current first-use surface | Main layout finding | Safe correction direction |
|---|---|---|---|
| Administrator | Role quick-start followed by Executive Command Center | The maintenance overview combines action shortcuts, auto-mode controls, KPIs, charts, alerts, AI intelligence, claims, invoices, cashflow, risk projects, portfolio, reports, and intelligence in one long command center. | Keep the maintenance overview, but make first actions compact and move heavy analytics into clearly secondary sections. |
| Technical Dept. | Quick-start followed by My Assignments / technical dashboard | The shared quick-start is useful, but the dashboard then presents a dense assignment list with only one direct action. | Keep project/report/HSE actions first; make assignment state a compact, readable work queue with an intentional empty state. |
| Logistics | Quick-start followed by Warehouse Overview | The quick-start and warehouse dashboard both describe stock and dispatch, while the dashboard’s two-card metric grid leaves unused space and then shows alerts/intelligence. | Keep stock/dispatch actions first, use a compact two-metric snapshot, and demote AI narrative until there is information to interpret. |
| Accounts | Quick-start followed by Financial Overview | The shared actions are useful, but the dashboard repeats Finance concepts and the two-card grid is laid out as a four-column metric area with empty space. | Present money-in/money-out actions first, compact the two metrics, then show recent expenses and intelligence. |
| HR | HR task-first dashboard with connected HR-Finance summary | This is the reference correction: task links appear before monitoring metrics, and detailed connected workspaces are behind disclosure. | Preserve this architecture. |
| Marketing | Quick-start followed by Sales & Reception | The dashboard contains a hardcoded `—` Opportunities metric instead of a live count and uses clickable metric cards without an explicit link/button affordance. | Replace the placeholder with a live opportunity count and make metric destinations visibly actionable. |
| Knowledge Manager | Quick-start followed by Institutional Knowledge | The shared quick-start duplicates the dashboard’s Registry, Training, and Messages controls, creating repeated navigation. | Let the focused knowledge dashboard own those three actions and reduce the shared wrapper duplication. |
| Trainee Dept. | Quick-start followed by Trainee Dashboard | The shared `Submit a reflection` action routes back to `/dashboard` rather than directly opening the reflection workflow, while the dashboard also has its own submit button, summary cards, and history. | Let the trainee dashboard own the learning path and submission action; remove the duplicated outer quick-start. |

## Shared defect pattern

The primary defect is not color or typography. It is **stacked responsibility layers**: the global role banner, shared quick-start, shared attention queue, and role-specific dashboard each try to be the first thing a user should read. In the empty-data state, this creates unnecessary vertical separation and leaves large panels with no content. The role-specific dashboards need a consistent order: orientation, immediate task actions, compact source-derived snapshot, then work queues or intelligence.

## Implementation guardrails

No new database tables, migrations, or live records are required for this layout correction. Existing source queries and role-scoped links must be preserved. Static sample values and misleading placeholders must not be introduced. The maintenance role switcher remains an inspection harness and does not grant cross-role mutation authority.

## Implemented layout corrections

The shared dashboard shell now presents the compact role quick-start immediately after the role responsibility banner, keeps the shared attention queue compact and close to those actions, and lets each focused role dashboard own its content instead of stacking duplicate outer controls. Knowledge Manager and Trainee now own their own first-use actions rather than receiving duplicate shared quick-start cards. Marketing now derives its opportunity count from live opportunity records instead of displaying a placeholder dash. The Administrator’s long executive analytics area is now behind an explicit `Open detailed oversight` disclosure, while its role shortcuts and status controls remain visible. No database mutation was performed.
