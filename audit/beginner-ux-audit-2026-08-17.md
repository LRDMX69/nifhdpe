# Beginner UX Audit — 17 August 2026

## Live surfaces inspected

The live Dashboard and HR pages were inspected in the authenticated maintenance session at `https://nifhdpe.vercel.app/dashboard` and `https://nifhdpe.vercel.app/hr`.

## Dashboard findings

The dashboard currently opens with the full Administrator navigation containing 22 visible destinations across Overview, Technical, Marketing, Logistics, Accounts, People, and Workspace. The role-testing switcher is placed directly above the main content and exposes Administrator plus seven role presets, with duplicate-looking labels for Technical Dept. and Trainee Dept. in the visible control set. The dashboard’s primary title is `Executive Command Center`, and the page includes Auto-Mode, Run Scans, Export, attendance, financial KPIs, AI intelligence, critical alerts, cashflow, projects, and field reports.

For a first-time user, the dashboard is information-rich but not task-oriented enough. A beginner must infer whether to use the sidebar, the role switcher, the Auto-Mode controls, or the KPI cards first. There is no obvious `Start here`, `My work today`, or role-specific quick-action path at the top of the page. Several labels are strategic or technical rather than operational (`Executive Command Center`, `AI Department Intelligence`, `Central AI Intelligence`, `Run Scans`). This creates a high decision load before the user reaches the actual work areas.

## HR findings

The HR page begins with a clear title and a short explanation, then places Request Leave, an expandable `How HR works here` helper, attendance, summary metrics, a `Connected operations` card with `Open connected view`, and a ten-item tab row for Attendance, Leaves, Payroll, ID Cards, Performance, Recruitment, Training, Skills, Disciplinary, and Promotions.

The live page confirms the user’s concern: the centralized cross-functional view is mounted inside the HR feature page as a modal-triggered connected view. This makes the HR page carry three competing navigation layers at once: the global sidebar, the HR tab strip, and a centralized operations view that opens on top of the feature workspace. The tab strip is dense for a beginner, and the connected view is described as read-only while its purpose is broad enough to be a dashboard-level overview. The centralized view should move to the HR dashboard entry experience, while the HR feature page should remain focused on HR-owned work.

## Initial UX direction

The redesign should make the dashboard answer four beginner questions immediately: `Where am I?`, `What is my role responsible for?`, `What needs attention today?`, and `What should I click next?` Role dashboards should show a concise role-specific welcome and a small set of labeled task cards before secondary analytics. The HR dashboard should own the centralized operational overview, with clear cards for HR finance, commercial and logistics context, and bank/reconciliation oversight. The HR feature workspace should retain HR-owned tabs and actions but remove the cramped centralized-view card/modal trigger. Navigation labels should favor familiar operational language, and duplicate role-switcher labels should be eliminated where safe.

## HR role dashboard retest

Using the live Operational Role Testing Switcher, the HR preset displayed a narrowed sidebar and a dedicated `HR Dashboard`. The visible dashboard contained only two KPI cards (`Checked In Today` and `Pending Leaves`), a pending-leave panel, and an AI Workforce Intelligence panel. It did not contain the HR centralized cross-functional view, finance/commercial/logistics context, bank review oversight, or direct next-action buttons for the HR-owned workspaces.

The HR role dashboard therefore confirms the information-architecture gap: the user’s role dashboard is too sparse to function as a reliable starting point, while the feature page carries the centralized cross-functional content in a cramped modal-triggered block. The redesign should bring the centralized view into the HR dashboard and add clear role-specific entry actions such as `Review attendance`, `Review leave requests`, `Open payroll`, `Manage employee records`, and `Open connected operations`.

The role switcher is also visibly labeled `Operational Role Testing Switcher` in the live product and includes duplicate-looking role labels caused by multiple enum aliases. That wording is appropriate for maintenance QA but not for everyday users; the production-facing role context should be presented as `Viewing as HR` or `Your workspace`, while the testing control should be visually secondary or maintenance-only.

## Post-deployment verification

After commit `3bc9672` deployed, the live dashboard showed the revised `Maintenance role preview` wording, a single canonical button for each available preset (`Administrator`, `Technical Dept.`, `Logistics`, `Accounts`, `HR`, `Marketing`, `Knowledge Manager`, `Trainee Dept.`), and the `Start here` responsibility banner. The Administrator dashboard also displayed three beginner-oriented shortcuts: `Review action queue`, `Review financial position`, and `Manage people and access`.

The live HR role dashboard now shows `Your HR workspace`, `Viewing as HR`, four clear first actions (`Review attendance`, `Review leave requests`, `Run payroll`, and `Manage people records`), current HR metrics, pending leave context, workforce intelligence, and an always-visible `Connected operations` section. The connected section is no longer a modal trigger inside the HR feature page; it is part of the role dashboard and presents `People & finance`, `Commercial & deliveries`, and `Bank review` as explicit work areas. The live HR dashboard loaded the Finance & Benefits Workspace by default and displayed the existing DMX salary and overtime records, confirming that the centralized view is connected to real data rather than a placeholder.

## HR feature-page verification

The live URL `https://nifhdpe.vercel.app/hr?tab=payroll` opened the Payroll tab directly, with the Payroll tab visibly selected and the real worker-payment records loaded. The HR feature page now remains focused on HR-owned tabs and actions. A live keyword search for the former `Connected operations` block returned no match, confirming that the centralized view was removed from the cramped feature-page surface after being relocated to the HR dashboard.

## Logistics role verification

The live Logistics preset displayed only the expected role-scoped modules and showed the new `Start with stock and dispatch` quick-start panel. Its three actions were clearly labeled `Check inventory`, `Plan a delivery`, and `Review purchases`, with descriptions matching the normal warehouse flow. The dashboard also retained the existing Needs Your Attention queue and live low-stock information, confirming that the beginner layer was added above real operational data rather than replacing it.

## Mobile responsive verification

A Playwright live session measured the deployed Dashboard redesign at `390×844`. The document width and body width were both exactly `390px`, with zero detected horizontal-overflow offenders. The Administrator quick-start panel rendered three visible `Open` links within the viewport. This confirms that the new beginner navigation layer preserves the previously certified mobile containment.

The browser session reported two console errors: a browser restriction for requesting Notification permission outside a short user event, and a rejected Supabase realtime `__cf_bm` cookie due to domain handling. Neither error originated from the UX components or prevented the dashboard from rendering and being measured; they are recorded as environmental/pre-existing runtime noise for follow-up separately.

## First-use onboarding collision and fix

The mobile accessibility snapshot exposed two simultaneous first-use layers: the role guide dialog (`Hi Ola, Platform Administrator Guide`) and the interactive `Welcome to NIF Operations` guided-tour dialog. Two overlapping dialogs create competing focus, obscure the dashboard, and force an untrained user to decide which instruction layer to follow. This was a genuine first-use UX defect.

The shared app shell was hardened so only the interactive guided tour auto-opens. The role guide component remains available in the codebase for future intentional use, while the dashboard’s `Start here` banner and the guided tour now provide the first-use explanation without overlapping modal layers. Local TypeScript, production build, 26 regression tests, and diff hygiene all passed after the fix.

## Architecture clarification and rollback

A later implementation temporarily moved `Connected operations` into the maintenance Administrator dashboard. That was an architectural mistake. The governing pasted specification confirms that the centralized HR view belongs on the normal HR role dashboard; the maintenance Administrator is only an inspection and role-preview environment and must not contain another role’s operational dashboard.

The mistaken Administrator placement has been removed and the HR dashboard implementation has been restored so the centralized view remains on the HR role dashboard. The maintenance role switcher remains available for inspecting the HR role experience without relocating HR content. Local validation after the rollback passed TypeScript, production build, all 26 regression tests, and diff hygiene.
