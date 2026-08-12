# Full Codebase Audit + Onboarding & Issues PDF

One deliverable: a PDF that first explains what this ERP is, what it does, and how it is structured and connected (written as onboarding context another AI can consume), then lists every issue found across the codebase.

## Scope — everything, no sampling

- **Frontend**: all 26 pages, every component folder (dashboards, hr, finance, logistics, messaging, projects, quotations, feedback, layout, ui), contexts, hooks, lib helpers.
- **Backend**: all 14 edge functions plus the `_shared` helpers (cors, auth, rateLimit, autoMode, spendCap, cronAuth, aiProvider, logger, errorHandler).
- **Database**: all 66 tables — RLS policies, GRANTs, foreign keys, enums, functions, triggers, indexes, unused/orphan tables.
- **Storage**: buckets and their policies, public/private correctness.
- **Config & build**: `vite.config.ts`, `vercel.json`, `index.html`, `manifest.json`, `sw.js`, `tsconfig*`, `package.json`.
- **Cross-cutting**: auth and role gating, organization scoping, error handling, loading/empty states, mobile layout, SEO and meta, accessibility, dead code, placeholders and hardcoded values, dependency vulnerabilities.

## How issues are found — evidence, not guesses

- Read every file end to end rather than skimming.
- Grep sweeps for TODO/placeholder text, hardcoded IDs and business values, `.single()` misuse, missing `organization_id` filters, unhandled rejections, stray `console.log`, loose `any`.
- Live database queries to confirm RLS, GRANTs and policy gaps.
- Security scan and dependency scan.
- TypeScript typecheck, lint pass, test suite run.
- Playwright pass over key routes at mobile and desktop widths to capture console errors, failed requests and layout breakage.

Each issue records: file and line, what is wrong, why it matters, severity (Critical / High / Medium / Low), and the recommended fix. Anything suspected but not proven is filed separately as "unverified — needs confirmation" instead of being stated as fact.

## PDF structure

1. **System overview** — what the NIF Technical Operations Suite is, the business it serves, the 11-role model.
2. **Architecture** — stack, routing, auth flow, org scoping, data flow from UI through backend to database.
3. **Module map** — every page: purpose, tables touched, edge functions called, roles allowed.
4. **Database reference** — tables grouped by domain, key columns, relationships, enums, functions and triggers.
5. **Edge functions reference** — trigger, inputs, outputs, auth model, auto-mode gating for each.
6. **Background jobs and AI** — cron schedule, auto-mode gate, provider fallback, spend cap.
7. **Conventions** — design tokens, PDF generation, naming, patterns a new contributor must follow.
8. **Issues register** — the full list, grouped by severity then by area.
9. **Appendix** — unverified items, and things only the owner can fix (env vars, email delivery, provider config).

## Technical notes

- Read-only pass: no source files change.
- PDF built with ReportLab using the navy/lime brand colors and a Unicode font so the Naira sign and accents render correctly.
- Every page rendered to an image and visually inspected before delivery; regenerated until clean.
- Written to the documents area and delivered as a downloadable artifact.

## Deliverable

One PDF. No code changes in this pass — fixing the findings would be a separate follow-up, prioritized by the severity list.