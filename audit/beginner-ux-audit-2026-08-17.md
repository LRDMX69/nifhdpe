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

## Pasted-spec architecture verification

After commit `bf1f259` deployed, the maintenance Administrator dashboard showed the Administrator-specific command center, role preview buttons, and Administrator quick-start cards, but no HR connected-operations section. Switching the maintenance preview to `HR` displayed the normal HR dashboard with its centralized `Connected operations` view, including `People & finance`, `Commercial & deliveries`, and `Bank review`, alongside HR-specific actions and live HR data. This matches the pasted specification: the maintenance role inspects other role experiences; it does not contain or replace them.

## Finance guess-the-click audit

The Finance page passed the first-use hierarchy test better than the Administrator dashboard. A beginner can see the page title, plain-language description, clear actions (`New Invoice`, `Log Payment`, `Log Expense`), a visible `How money moves through this page` workflow explanation, and tabs named `Overview`, `Invoices`, `Receipts`, `Expenses`, `Payments`, and `Bank Analysis`. The invoice action in HelpSheet also points to the Invoices tab.

Opening `/finance?tab=invoices` selected the Invoices tab directly and showed the `Client Invoices` table with a second local `New Invoice` action. The table exposed real invoice number, client/reference, source/site, date/due, status, amount, balance, and bank-link context. The likely beginner friction is terminology: `Gross / net`, `Bank link`, `Source / site`, and `standard` are accounting/implementation terms that need helper text or column tooltips. The current table is also dense on desktop and will need mobile verification for horizontal containment and discoverability of row actions.

## Quotations guess-the-click audit

The Quotations page has a strong first-use structure. It presents a plain-language title, a `New Quotation` action, a `How this works` banner describing Draft → Send → accepted sales order → confirmed order → delivery and finance, and a visible commercial order lifecycle section. The path from quotation to linked sales order and invoice is discoverable without prior training, and the `Open catalogue` action clearly explains that approved HDPE catalogue records are maintained inside the workflow.

The New Quotation dialog exposes Itemized/Lump Sum, Client, Opportunity, Pipe Type, Profit Margin, Line Items, Labor, Transport, Discount, Overhead/site cost, Tax, Site/project reference, Payment terms, Assumptions, Exclusions, and Terms and conditions. The main usability risk is that several numeric fields are displayed with dense abbreviations or units (`₦/m`, `₦`) and the dialog is vertically long on smaller screens. A first-time user may also click `Save & Send` without understanding that it is the customer-facing transition, although the page banner partially explains this. This surface should receive mobile dialog testing and stronger inline helper text for the two save actions.

## Logistics guess-the-click audit

Logistics presents a coherent sequence: `How this works` explains confirmed orders entering dispatch, the confirmed-order queue exposes `Create delivery`, and the delivery surface contains `Deliveries`, `Fleet`, and `Fuel Log` tabs plus search and status filtering. The linked live UAT delivery displayed its sales-order lineage and the actual conveyed item, which is strong connected-workflow evidence.

The New Waybill dialog uses a clear title, `Issue and print waybill`, and an excellent lifecycle explanation: save the permanent record, render the PDF, mark it printed, and keep failed rendering retryable. The primary action `Generate, save & print waybill` is explicit. A first-time user may still need help distinguishing `Source delivery`, `Sales order`, `Client`, `Project`, and `Project label`, because the form initially defaults to `Standalone waybill` and presents implementation lineage before asking for the operational destination and driver details. The item row is understandable through its placeholder, but `pcs` and free-text quantity/unit inputs should have an explicit unit hint or select options for non-technical users.

## Document Registry guess-the-click audit

The Document Registry is one of the most intuitive surfaces. Its title states the purpose plainly, the helper banner explains that records are created in source modules and appear here for search/reference, and the page exposes search, date range filters, CSV export, and document-type tabs. Filtering to `Waybill (2)` displayed both issued waybills with their reference, date, destination, status, and visible `Reprint` action. This directly supports the intended document lifecycle and makes the reprint path guessable.

One loading-state issue was observed during initial navigation: the type tabs briefly displayed zero counts while the page showed skeleton rows, then updated to the correct counts (`All (27)`, `Waybill (2)`, and so on). This is acceptable if the loading state is clearly perceived, but the tab labels could be disabled or marked loading to avoid a momentary false impression that the registry is empty.

## Messages guess-the-click audit

Messages has an intuitive page title, one-line purpose (`Internal communication`), search field, `New Chat`, `Broadcast`, and a `How this works` banner explaining that direct chats are private, broadcasts are admin-only read-only announcements, and project/report context chats live in their source modules. Opening `New Chat` produced a compact form with `To`, `Message`, `Send`, and `Close`; the interaction is easy to guess and the send action is explicit.

The main usability gap is contextual rather than navigational: the new-message form offers only recipient and message body, with no subject, priority, attachment, project, delivery, or report context selector. Because the helper says project/report chats live elsewhere, a beginner may not know where to start a conversation about a specific operational record. This should be considered for a later workflow-context enhancement, but the basic direct-chat path is clear and safe.

## HR feature-page guess-the-click audit

The HR feature page is now appropriately scoped to HR-owned work. Its title and description explain the module, `Request Leave` and `Check In` are visible primary actions, the `How HR works here` banner describes the responsibility chain, and the tab row clearly names Attendance, Leaves, Payroll, ID Cards, Performance, Recruitment, Training, Skills, Disciplinary, and Promotions. The attendance empty state explains exactly why no records are present, who performs check-in, and what HR reviews. The page remains deep-linkable through `/hr?tab=attendance` and `/hr?tab=payroll`.

A live keyword search for `Connected operations` returned no match on the feature page, confirming that the centralized view is not duplicated or cramped here. The normal HR dashboard remains the correct overview surface.

## Complete route smoke audit

A read-only Playwright smoke pass visited 21 major routes: Dashboard, Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, Opportunities, Quotations, Clients, Inventory, Logistics, Finance, Procurement, Analytics, HR, Claims, Messages, Documents, and Settings. Every route rendered the expected product shell and route-specific content, no route exposed an application-error or failed-load message, and every route measured `documentWidth === viewportWidth` at the 500px test width with no horizontal overflow detected.

The route smoke also confirms that each major page has a recognizable title or descriptive first content. The dashboard’s first DOM `h1` is the shell branding `NIF Technical` rather than the inner role-dashboard heading, so a future accessibility/semantic polish pass should ensure the page-level dashboard heading is the primary heading exposed to assistive technology.

## Maintenance role-preview obstruction

During a desktop role-matrix automation pass, the auto-opening Guided Tour overlay intercepted pointer events on the `Technical Dept.` role button. The role button was visible and enabled, but the tour overlay blocked the click for 30 seconds. This is a genuine usability defect for the maintenance workflow: the maintenance role exists specifically to inspect other role experiences, so a first-use tour must not prevent access to the role switcher. The fix should suppress automatic tour launch for maintenance sessions while retaining a replayable tour for normal users.

## Role-dashboard and maintenance-preview audit

After the guided-tour hardening deployed, the desktop role matrix successfully switched through all eight canonical presets: Administrator, Technical Dept., Logistics, Accounts, HR, Marketing, Knowledge Manager, and Trainee Dept. The previous click interception did not recur. Each role rendered a role-specific start banner or dashboard copy, role-scoped sidebar links, and `documentWidth === viewportWidth` at `1200×900`.

The HR role exposed the centralized dashboard view and four direct workspace actions. Logistics exposed `Check inventory`, `Plan a delivery`, and `Review purchases`; Accounts exposed money-in/money-out actions; Marketing exposed sales-pipeline actions; Technical exposed site-work actions; Knowledge Manager exposed shared knowledge actions; and Trainee narrowed the surface to dashboard, calculator, and documents actions rather than exposing unrelated operational modules. The Administrator retained its own command-center and inspection controls without embedding the HR centralized workspace. This is consistent with the pasted architecture and materially improves first-use predictability.

## Cleared-data visual re-audit

The live database was cleared for operational use, so no further UAT mutations will be performed. The empty HR dashboard was inspected in the maintenance role’s HR preview at the live deployment. The current composition is visually clean in color and typography but structurally overloaded: the command center appears as a large standalone block, followed immediately by four repeated action cards, four repeated KPI cards, a pending-leave panel, workforce intelligence, connected-work-area controls, the detailed Finance & Benefits workspace, and the legacy HR content below. The page asks a first-time employee to process too many layers before reaching a clear next action.

The empty-state screenshot also shows a loading command-center card while the rest of HR already renders, which creates an unstable first impression. The repeated “Open workspace” cards and the later “Choose a work area” controls overlap conceptually, while the command center’s large set of individual finance metrics creates a second dashboard inside the HR dashboard. The layout needs a single primary “Today” area, a compact people snapshot, and a clearly secondary connected-finance summary that is collapsed or visually grouped rather than displayed as a long uninterrupted wall of cards. No data was created, edited, approved, or deleted during this re-audit.

## Post-refactor empty-state verification

After the rebased layout commit `4e12b3b` and CI run `32030647795` passed, the live HR preview was retested after the database reset. The page now follows one visible sequence: HR orientation, `HR + Finance at a glance`, a compact `What needs attention` strip, `Today’s picture` with four people/HR metrics and four finance metrics, a quiet financial-movement panel, collapsed `More finance details`, `Start your HR work`, `People pulse`, leave requests, workforce notes, and a collapsed `Detailed connected workspaces` section. The former four large action cards and the hardcoded `Connected areas 3` KPI were removed. The empty state reads as intentionally quiet rather than as a wall of repeated cards, and detailed payroll/commercial/bank workspaces remain available behind an explicit `Open connected workspaces` control.

## Post-refactor mobile verification

At `390×844`, the deployed HR dashboard measured `documentWidth = 390` and `bodyWidth = 390`, with no horizontal overflow and no visible application-error boundary. The command center remained visible, while the intentionally collapsed `More finance details` area exposed `View details` without forcing the full secondary metric set into the first viewport. The mobile action surface retained visible `Review attendance`, `Review leave requests`, `Run payroll`, `Manage people records`, and `Open connected workspaces` controls. The role preview session reported two console errors from the existing browser session, but no visible runtime failure in the refactored HR layout.

## Post-refactor tablet verification

At `768×1024`, the live HR dashboard measured `documentWidth = 768` and `bodyWidth = 768`, with no horizontal overflow, no visible application-error boundary, visible HR headings, visible daily action links, and the secondary detail controls still collapsed. The tablet layout therefore preserves the intended order without forcing the user into a wide table or a dense multi-column wall.

## Detail disclosure verification

The `Open connected workspaces` disclosure was opened once on the live HR dashboard. It expanded successfully and exposed the existing `People & finance`, `Commercial & deliveries`, and `Bank review` work areas, including the Finance & Benefits workspace. This confirms the layout correction reduced first-view density without removing the centralized HR role capability.

## Final hierarchy adjustment

The final review showed that even the compact version was clearer when the four everyday HR tasks appeared immediately after the page orientation, before the connected HR-Finance summary. The order is now: **Start your HR work → HR + Finance at a glance → People pulse and supporting context → detailed connected workspaces**. This keeps the centralized view on the HR dashboard while making the first click obvious for an untrained employee.

## Final live task-first verification

After commit `0a84bdf` and CI run `32031025038` completed successfully, the deployed HR preview now presents `Start your HR work` before `HR + Finance at a glance`. The first visible action links are `Review attendance`, `Review leave requests`, `Run payroll`, and `Manage people records`; the connected finance summary follows as a monitoring layer, and `Open connected workspaces` remains available at the bottom behind explicit disclosure. The cleared live data renders as `0` payroll, `0` receivables, `0` bank position, `0` income, and `0` supplier obligations without placeholder sample records, while the real organization-member count remains visible as `3`.
