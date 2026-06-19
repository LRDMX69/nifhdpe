
# NIF Technical Operations Suite — Executive Production Audit

Scope: end-to-end audit against NIF Technical Services' real business (HDPE piping, water infrastructure, firefighting systems, civil/MEP construction, procurement-heavy project execution). Verdict at the end.

---

## 1. Company Fit — what NIF actually does vs. what the ERP covers

NIF's operating reality (from nifhdpe.com and the HDPE/firefighting/water-infra sector):

- Project-based contracting: surveys → design → BOQ → quotation → award → mobilisation → execution → handover → warranty.
- Heavy material flow: HDPE pipes (PE80/PE100, multiple SDRs/diameters), fittings, valves, hydrants, pumps, fire panels.
- Field crews working at remote sites, often with weak connectivity.
- Subcontractors and casual labour alongside permanent staff.
- Clients are mostly B2B / govt / EPC primes — long payment cycles, retention, performance bonds.
- Regulatory: SON/NIS standards, factory acceptance tests, hydrostatic pressure test reports, HSE statutory filings.

### What the ERP already covers well
Projects, Field Reports, Inventory (with rack/zone), Logistics with GPS geofence, HR (attendance, payroll, leaves, ID cards), Finance (invoices, expenses, payments), Worker Claims, Equipment, HSE, Compliance docs, Quotations + pipe calculator, Opportunities scanner, Messaging, Knowledge Base, Document Registry, dual AI providers.

### Business-critical gaps (must address for "primary operational platform")

| # | Gap | Why it matters for NIF |
|---|---|---|
| G1 | **BOQ / Bill of Quantities module** distinct from Quotations | Tenders are won/lost on BOQ accuracy; currently quotations conflate the two |
| G2 | **Subcontractor & casual labour register** with day-rate tracking | A large share of site spend; today only permanent staff exist |
| G3 | **Retention & performance bond tracker** on invoices | 5–10% retention held for 6–24 months — invisible today |
| G4 | **Material certificates & test reports** linked to deliveries (hydrostatic test, FAT, MTC) | Required at project handover; today only generic compliance docs |
| G5 | **Snag list / punch list** per project with photo evidence | Standard handover artefact; missing |
| G6 | **Variation order / change request** workflow distinct from new quotation | Every construction project has VOs; today users would re-quote |
| G7 | **Daily Site Diary** (weather, manpower count, equipment on site, visitors) separate from Field Reports | Statutory + client requirement on civil works |
| G8 | **Petty cash & site imprest** ledger | Site engineers spend cash daily; expenses module assumes office workflow |
| G9 | **Vendor performance scoring** + preferred-vendor list | Procurement currently treats all vendors equally |
| G10 | **Project cashflow forecast** (committed PO vs invoiced vs received) | CEO/Finance cannot answer "how much cash do I need next month?" |
| G11 | **Tender deadline calendar + bid/no-bid register** | Opportunities scanner finds bids but there is no go/no-go workflow |
| G12 | **Drawing & revision register** (PDF/DWG) with rev numbers | Drawings drive everything on site; Document Registry has no rev control |
| G13 | **Client portal (read-only)** for project progress, invoices, statements | Reduces email back-and-forth; differentiator vs competitors |
| G14 | **Approval chains** (multi-step) for POs, expenses > threshold, leave > N days | Today most approvals are single-actor |
| G15 | **Period-end close reports**: project P&L, ageing receivables/payables, WIP | Finance currently has data but no scheduled closing pack |

---

## 2. Hidden Issues Found (production audit)

### Authentication / Authorisation
- A1. Console shows repeated `TypeError: Failed to fetch` during auth bootstrap → no retry/backoff; user lands on blank "Restoring access" screen if the first PostgREST call drops. Needs `Promise.allSettled` + retry.
- A2. `ProtectedRoute` uses `navItems.find(item => item.path.split("?")[0] === path)` — secondary routes registered with query strings (e.g. `/finance?tab=invoices`) and any new sub-route not in `navConfig` silently fall through with no gating. Switch to an explicit allow-map keyed by base path.
- A3. Role switcher in `DashboardRouter` lets maintenance switch to roles that have no dashboard component (`engineer`/`technician` mapped, but `trainee` not). Trainees with multi-role see blank.
- A4. `MFAEnforcer` does not differentiate between maintenance and real admins → maintenance can be locked out if MFA factor lost. Add maintenance bypass with audit log entry.
- A5. `is_member_of_org` check inside edge function uses user-JWT client → fails for users with valid session but stale local JWT; needs refresh-on-401.

### RLS / Database
- D1. `user_feedback` (new): admin SELECT policy should be scoped by `organization_id`; verify.
- D2. Audit-log trigger writes `new_data`/`old_data` as `to_jsonb(NEW)` — exposes hashed passwords if ever extended to `auth` schema. Add explicit column filter for any future PII table.
- D3. Several tables (`messages`, `worker_payments`) accumulate without retention; add archive table + 24-month cutoff.
- D4. `enforce_max_roles` runs only on INSERT — UPDATE that changes `user_id` bypasses the cap.

### Workflows
- W1. Quotations → Invoice handoff is manual re-entry. Should be one-click "Convert accepted quotation to invoice".
- W2. Equipment requests have AI escalation but no SLA timer visible to requester.
- W3. Field Reports allow submit without site photo on certain templates → enforce ≥1 GPS-tagged photo for any "site visit" type.
- W4. Worker Claims do not block duplicate submission for same date+category.
- W5. Attendance: holiday and check-out-after-5-PM rules are enforced, but no "forgot to check out" auto-close at 23:59 — users lose entire day.
- W6. Logistics: 300 m geofence is hardcoded — needs per-project override (yard deliveries vs remote sites).
- W7. Procurement: no three-way match (PO ↔ GRN ↔ Invoice) gate before vendor payment.
- W8. Print requests: receptionist sees queue but no overdue indicator.

### UX / Detailing
- U1. Many empty tables still render bare "No data" — needs `EmptyState` with CTA pointing to where data comes from.
- U2. Error states show raw Supabase codes (PGRST200, 23505) — `humanizeError` exists but is not yet wired into all modules.
- U3. Mobile bottom nav can show different items per role with no overflow indicator — add "More" sheet listing the rest.
- U4. PWA install prompt fires after 30 s even on a desktop session — gate by `display-mode: browser` + mobile UA.
- U5. No global keyboard shortcut help (`?` to open CommandPalette legend).
- U6. No "what's this page for?" 1-line subtitle on each PageHeader — already a component, just unused on most pages.
- U7. Dashboards lack "last refreshed" timestamps; users can't tell if data is live.
- U8. PDF reports lack page numbers and document watermark for DRAFT vs FINAL.

### Performance / Reliability
- P1. `QueryClient` retry=1 silently swallows transient errors — surface a toast on second failure.
- P2. Several pages do `select('*')` on large tables (`projects`, `inventory`) — switch to explicit column lists and `range()` pagination.
- P3. Realtime subscriptions not torn down in `Messages.tsx` when leaving page → memory leak after long sessions.
- P4. No service-worker update prompt — users keep old bundle indefinitely after deploy.

### Security
- S1. Edge functions read `SUPABASE_SERVICE_ROLE_KEY` and use it broadly — ensure no path returns service-role data to unauthenticated callers (audit `assign-pending-roles`, `admin-terminate-user`).
- S2. `verify_jwt = false` on `opportunity-scanner`, `auto-mode-runner`, `admin-terminate-user` — confirm cron secret check is present in code, not just relied on by config.
- S3. Storage buckets `site-photos` and `claims-proof` are public — verify no PII in filenames; consider signed URLs.

---

## 3. Recommended Client-Management Structure (HR question)

Recommendation: **Do NOT give HR full client management.** Use a tiered model:

| Capability | Admin | Marketing/Reception (Sales) | Finance | HR |
|---|---|---|---|---|
| Create / edit client core record | Yes | **Yes (primary owner)** | No | No |
| Deactivate / merge / delete client | Yes | No | No | No |
| View client list + contact info | Yes | Yes | Yes | **Yes (read-only)** |
| Add billing & tax details | Yes | No | **Yes** | No |
| Add contract & retention terms | Yes | Yes (draft) | Yes (approve) | No |
| See client P&L | Yes | Summary only | Yes | No |

Reasoning:
- Clients are a **sales artefact**, not an HR one. Sales/Marketing already owns Opportunities and Quotations — giving them clients keeps one owner across the pipeline.
- HR's interest in clients is usually personnel placement at client sites. Solve that with **read-only access + a "Client Site Assignments" table** linking employees to client locations, instead of full CRUD.
- Finance must edit billing/tax fields without touching contact data → add field-level edit permission, not full edit.
- Deletion stays Admin-only to preserve audit trail.

This avoids the bottleneck the user worried about (admins as single point of failure) while keeping ownership clean.

---

## 4. Recommended Role-Permission Refinements

- Introduce **`project_manager`** role (subset of administrator scoped to assigned projects) — currently all PM authority sits with Admin or Engineer.
- Introduce **`finance_clerk`** vs **`finance_manager`** split — clerks post entries, managers approve > ₦500,000.
- Allow **HR Assistant** read-only on Finance payroll preview to remove HR↔Finance email loop.
- Marketing should see Invoices (already in nav) but only their **own clients' invoices** — current RLS likely shows org-wide.
- Trainee dashboard exists but no nav gating verified — confirm Knowledge Base + Learning Reflections only.

---

## 5. Three-Month Roadmap (prioritised)

### Sprint 1 (Week 1–2) — Stop the bleeding
- Wire `humanizeError` + `EmptyState` + `ErrorState` across all 22 pages (UX sweep already planned).
- Fix A1, A2, A4, W5, W7, P3, P4, U4, U7.
- Add page subtitles (U6) and "last refreshed" stamps.
- Tighten `user_feedback` RLS scoping (D1).

### Sprint 2 (Week 3–4) — Workflow completeness
- One-click Quotation → Invoice (W1).
- Three-way match gate for vendor payments (W7).
- Snag list module (G5) + Daily Site Diary (G7).
- Approval chains framework (G14) — generic `approval_steps` table reusable across PO/Expense/Leave.
- Petty cash / site imprest ledger (G8).

### Sprint 3 (Week 5–6) — Construction-specific
- BOQ module (G1) reusing pipe calculator engine.
- Variation orders (G6).
- Material certificates linked to GRN (G4).
- Drawing register with revision control (G12).
- Retention & bond tracker on invoices (G3).

### Sprint 4 (Week 7–8) — Management visibility
- Project cashflow forecast (G10).
- Period-end close pack: project P&L, AR/AP ageing, WIP (G15).
- Vendor scoring (G9).
- Tender go/no-go register (G11).
- CEO dashboard: cash position, top 5 overdue invoices, top 5 risk projects.

### Sprint 5 (Week 9–10) — Workforce reality
- Subcontractor & casual labour register with day-rate timesheet (G2).
- Per-project geofence override (W6).
- "Forgot to check out" auto-close (W5).
- Field-report photo enforcement (W3).

### Sprint 6 (Week 11–12) — External-facing
- Read-only client portal (G13) — magic-link auth, project progress + invoices + statements.
- Service-worker offline queue extension for site diary + snag list.
- Final security pass on edge functions (S1–S3).
- Penetration-style RLS test suite.

---

## 6. Verdicts

**Enterprise-readiness:** 7/10. Visual system, role architecture, audit logging and AI plumbing are above-average for an in-house ERP. Held back by detailing gaps and a few raw error surfaces.

**Production-readiness (current state):** 6.5/10. Safe to use as a **secondary** operational system today. Two blockers before becoming primary: (a) three-way procurement match and (b) approval chains for spend.

**Company fit for NIF specifically:** 6/10 today, 9/10 after Sprints 1–3. The missing construction-specific artefacts (BOQ, VOs, snag lists, test certs, drawing register) are the difference between "good office ERP" and "tool the company can actually run projects from."

**Three-month confidence if Sprints 1–4 ship:** the platform can confidently become NIF's primary operational workspace for projects, procurement, HR, finance and field operations, with Word/Excel reduced to occasional drafting only.

---

## 7. What I need from you

Pick the execution mode:

- **A. Sprint 1 now** — I implement all Sprint 1 fixes this session (UX sweep, auth bootstrap fix, user_feedback RLS, page subtitles, refresh stamps, attendance auto-close, three-way match scaffolding).
- **B. Custom slice** — tell me which specific items from sections 2/5 to ship first.
- **C. Roadmap only** — keep this document as the source of truth, no code changes this turn.

Also confirm the **client-management tier table** (section 3) before I touch RLS on `clients`.
