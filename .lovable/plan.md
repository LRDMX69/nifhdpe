# ERP-Wide Usability & Workflow Audit — Phased Plan

Google Sign-In is already removed and the email-only flow is live. This plan covers the remaining work: making every module self-explanatory, professional, and admin-light.

To keep quality high and avoid shallow generic copy, the audit is split into 8 phases. Each phase is one focused turn that ships real changes (empty states, helper text, workflow banners, status copy, admin-reduction tweaks) for the modules in that phase. You approve, I move to the next phase.

## Phase 1 — Shared UX primitives (foundation)
Build the reusable pieces every later phase will use:
- `<EmptyState>` component: icon + title + explanation + "who creates this" + primary CTA
- `<WorkflowBanner>` component: collapsible "How this works" card for the top of each page (who starts → who reviews → who approves → what happens next)
- `<FieldHint>` and consistent tooltip pattern for form fields
- Standard status-badge copy map (Pending, Under Review, Approved, Rejected, In Progress, Completed, Cancelled) with one-line descriptions
- Standard toast vocabulary (success/error/info) — professional, business-oriented tone

## Phase 2 — HR module (highest pain, fresh feedback)
Attendance, Leaves, Payroll, ID Cards, Recruitment, Performance, Disciplinary, Skills, Training, Promotions.
Per tab: page purpose banner, meaningful empty states, field hints, workflow descriptions, status copy, admin-reduction (self-service leave status checks, payroll preview before posting, etc.).

## Phase 3 — Finance & Accounts
Invoices, Payments, Expenses, Vendors, Worker Claims, Payroll posting, Accounting Periods, Receipts.
Includes the "Clients must be created by Admin first" pattern across every dropdown, AI-anomaly explanations in plain English, and clearer payment lifecycle copy.

## Phase 4 — Projects & Field Operations
Projects, Field Reports, Deliveries, Material Requisitions, Equipment Requests, HSE Incidents, Toolbox Talks, Fuel Logs.
Workflow banners for every approval chain, GPS-failure explanations, delivery status meanings, project-head responsibilities.

## Phase 5 — Inventory, Procurement & Logistics
Inventory (pipes/fittings), Storage Locations, GRNs, Purchase Orders, Vehicles, Equipment.
Clear "low stock" thresholds, location-finder guidance, PO lifecycle, GRN reconciliation copy.

## Phase 6 — Sales pipeline
Clients, Quotations, Opportunities, Quotation conversion flow, Pipe Calculator entry points.
"What is an opportunity vs a quotation vs an invoice" explainer, conversion CTAs, AI-bid-scan transparency.

## Phase 7 — Communications, Knowledge & Compliance
Messages (DMs/broadcasts/context chats), Knowledge Base, Compliance Documents, Document Registry, Learning Reflections, Print Requests.
Privacy notices, document-expiry warnings, broadcast-vs-DM guidance, trainee learning prompts.

## Phase 8 — Dashboards, Settings & cross-cutting polish
All 8 role dashboards (Admin/Engineer/HR/Finance/Sales/Technician/Trainee/Warehouse), AppSettings, NotificationBell, Command Palette, PendingApproval page, error pages.
Per-role "your responsibilities today" cards, settings descriptions, notification grouping copy.

## Cross-cutting rules applied in every phase
- No empty state ever says "No data" — every empty state names who creates the record, why it matters, and the next action
- Every page gets a one-line purpose tagline under its title
- Every approval workflow gets a "Who → What → When" banner
- Every status badge has a tooltip explaining what it means and who can change it
- Terminology audit: "User" → role-specific labels where appropriate; remove jargon
- Admin-reduction: surface self-service where security allows (status visibility, profile editing, leave balance, payroll preview), keep approval/role/financial-posting actions admin-only
- Text tone: professional, business-oriented, second-person, action-led

## What this plan does NOT include
- Backend schema changes (out of scope unless a phase uncovers a real blocker)
- New features beyond what already exists
- Visual redesign — design system stays as-is, only copy/empty-states/banners change
- Removing functional modules — only clarifying them

## Execution model
After you approve, I start Phase 1 immediately. Each subsequent phase is one turn — you say "go" or give feedback. Phases 2–8 can be reordered if priorities shift.
