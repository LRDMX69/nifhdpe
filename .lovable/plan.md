## Goal

1. Guarantee auth redirects always match the host the user is currently on (Vercel `nifhdpe.vercel.app` vs Lovable `nifhdpe.lovable.app` vs custom domain vs preview), with no hardcoded URL anywhere.
2. Run a thorough audit across the codebase and backend to surface anything missing, broken, partially implemented, mocked, or stubbed — and fix it.

## Part 1 — Host-aware redirects

The current `src/lib/appUrl.ts` already returns `window.location.origin`, which is the correct dynamic behavior. I will:

- Re-confirm every auth/OAuth/email entry point uses `getAppUrl()` / `getAuthRedirect()` and never a hardcoded domain:
  - `Login.tsx` — Google OAuth, magic link, password reset
  - `ResetPassword.tsx`
  - `AuthContext.tsx` — `signUp` email confirmation `emailRedirectTo`
  - Any edge function that builds redirect URLs (e.g. invitations, role-assignment emails) — switch to reading the `Origin` header of the incoming request instead of an env constant.
- Add a tiny comment block in `appUrl.ts` documenting the contract ("redirects always follow the active origin — do not hardcode").
- Add the Vercel production origin and the Lovable published origin to the Supabase Auth **Additional Redirect URLs** allowlist so both hosts are accepted by Supabase after the OAuth round-trip. Without this the provider will reject one of them.

## Part 2 — Codebase + backend audit

I'll grep the repo and inspect each finding, then fix issues in priority order.

### Audit checklist

1. **Hardcoded URLs / domains** — `rg "lovable.app|vercel.app|http(s)?://"` across `src/` and `supabase/functions/`. Replace with dynamic origin.
2. **Mocks, stubs, TODOs, fake data** — `rg "TODO|FIXME|mock|stub|fake|placeholder|lorem|coming soon|not implemented"` across `src/`. For each hit, decide: wire to real data, remove, or convert to a clear empty state.
3. **Dead code** — unused pages, unused components, unused exports, leftover `ANALYSIS.md` / `CODE_AUDIT.md` notes, unreferenced edge functions. Delete safely.
4. **Edge functions** — list each function under `supabase/functions/`, confirm:
   - It is actually invoked from the frontend or a cron job.
   - It returns CORS headers, handles `authErr`, and uses `validateServiceOrUser` consistently.
   - Secrets it expects are present (`LOVABLE_API_KEY`, `GEMINI_API_KEY`, etc.) — surface any missing ones via `add_secret`.
5. **AI flows** — `useAiAssistant`, `ai-orchestrator`, `opportunity-scanner`, `anomaly-detection`, `central-ai-monitor`, `auto-mode-runner`, `department-automation`, `daily-summary`, `hr-analysis`, `message-moderation`, `process-report`, `stock-analysis`. For each: trigger path exists, response is consumed in UI, errors toast cleanly.
6. **Database** — run `supabase--linter` and `db_health`. Reconcile the migration drift by creating one consolidated "catch-up" migration that mirrors the backend's current schema so the local history matches going forward. Verify RLS on every public table.
7. **Realtime / cron** — confirm `pg_cron` jobs for opportunity scanner and auto-mode-runner are still scheduled and firing.
8. **Routes** — every route in `App.tsx` resolves to a real, fully-built page (no placeholder pages).
9. **Role gating** — every nav item's `roles` array matches the page's internal role check; no orphan navigation.
10. **PWA** — service worker registers only on published host, push notifications subscribe correctly, `/~oauth` is not cached.
11. **Build / type check** — confirm a clean build with no TS errors.

### Fix strategy

- Group findings into: (a) trivial cleanups (delete dead files, replace hardcoded strings), (b) real bugs (broken flows, missing handlers), (c) backend reconciliation (migration catch-up, missing RLS).
- Apply (a) and (b) as direct edits.
- For (c), generate one new timestamped migration that brings the local history in sync with the backend, then verify with the linter.

## Deliverable

- Dynamic, host-aware redirects verified end-to-end on Vercel, Lovable, and preview.
- A short report at the end listing: files deleted, mocks replaced, edge functions fixed, migration catch-up applied, and any items I intentionally left (with reason).

## Technical notes

- `getAppUrl()` stays as `window.location.origin` — this is what makes Vercel vs Lovable "just work" on the client.
- Edge functions can't read `window`, so any server-built redirect must come from `req.headers.get("origin")` (validated against an allowlist of known hosts) rather than a hardcoded env var.
- The Supabase Auth redirect allowlist must include: `https://nifhdpe.lovable.app/*`, `https://nifhdpe.vercel.app/*`, `https://id-preview--*.lovable.app/*`, and any custom domain. I'll confirm and add missing entries.
