## Issues identified

1. **Build error** – `src/pages/Login.tsx(74,31)`: TS2554 (signature mismatch). The current `signUp` declaration in `AuthContext` and its call in `Login` need to be re-aligned (the build sees a stale 3-arg call) and explicitly typed so it stops drifting.

2. **Stuck on "Awaiting Role Assignment" (incl. maintenance account)** – `ProtectedRoute` only checks `memberships.length === 0`. For the maintenance admin, the membership is synthesized inside `AuthContext`, but if `fetchUserData` is racing with the initial session it can fall through to the empty-memberships branch and show PendingApproval. Also, regular users keep landing there because `handle_new_user` only fires for brand‑new signups — existing users have no `role_assignment_requests` row, and admins have nothing to approve.

3. **Google sign-in not working** – `Login.tsx` is calling `supabase.auth.signInWithOAuth(...)` directly instead of the managed Lovable Cloud helper (`lovable.auth.signInWithOAuth("google", ...)`). The native Supabase OAuth path is not configured, so it silently fails.

4. **"Generate Proposal Email" → Failed to fetch** – Two real bugs in the AI pipeline:
   - `useAiAssistant` does **not** send `organization_id`, but `ai-assistant/index.ts` now hard-requires it and returns 400.
   - The edge function logs show `TypeError: Cannot read properties of null (reading 'bodyUsed')` — the function crashes when the fallback `Response` is returned alongside `validateUser` errors, which produces a network-level "Failed to fetch" in the browser.

5. **Finance tab should live inside HR** – Currently Finance is a top-level nav entry; user wants the Finance dashboard/tab accessible from within HR (payroll/salary context).

## Plan

### A. Build & Auth fixes
- Re-sync `src/pages/Login.tsx` `signUp(...)` call with the 4-arg signature and add an explicit `Promise<{ error: Error | null }>` return type on `AuthContext.signUp` so TS catches drift.
- In `AuthContext`:
  - Synthesize the maintenance membership **inside the same state batch** as `setLoading(false)` so `ProtectedRoute` never sees an empty memberships array for maintenance users.
  - Hoist the localhost auto-maintenance bypass into the actual `isMaintenance` flag used by membership logic (today it only affects the exported value, not the membership branch).
  - Add a defensive re-fetch when `memberships.length === 0` after auth ready, so brand‑new admins immediately see the user instead of waiting for cache.
- In `ProtectedRoute`: treat `isMaintenance` and `activeRole != null` as sufficient to render children even if `memberships` hasn't hydrated yet.

### B. Google OAuth via Lovable Cloud
- Replace the inline `supabase.auth.signInWithOAuth("google", ...)` call in `Login.tsx` with `lovable.auth.signInWithOAuth("google", { redirect_uri: getAppUrl() })` from `@/integrations/lovable`.
- Call `supabase--configure_social_auth` with `providers: ["google"]` so the managed Google provider is actually enabled.

### C. AI assistant pipeline
- `useAiAssistant`: include `organization_id` (from `useAuth().activeOrganizationId`) in the POST body and refuse to call if it's missing.
- `supabase/functions/ai-assistant/index.ts`:
  - Wrap the whole handler so any thrown error returns a proper `Response` with CORS headers (no more null body crash).
  - Allow the existing `validateServiceOrUser` helper instead of `validateUser` (consistency with the other fixed functions).
  - Make sure the fallback `Response` reuses `corsHeaders` on `Content-Type: text/event-stream`.
- Redeploy `ai-assistant` after the edit.

### D. Finance inside HR
- Add a "Finance" tab to `src/pages/HR.tsx` that embeds the existing Finance summary widgets (payroll, salaries) — reusing components from `src/components/hr/tabs/PayrollTab.tsx` and `src/components/dashboards/FinanceDashboard.tsx`.
- Keep the standalone `/finance` route for Accounts users, but remove duplicate visibility for HR-only users from `navConfig.ts` so the sidebar isn't cluttered.

### E. Database reconciliation (single migration)
- Backfill `role_assignment_requests` rows for any existing user in `auth.users` who has **zero** memberships and no pending request, so admins can approve them from the Unassigned list.
- Ensure the `handle_new_user` trigger is actually attached to `auth.users` (recreate `AFTER INSERT` trigger if missing — this is what's making new signups invisible).
- Verify the `enforce_max_roles` trigger is attached to `organization_memberships`.

### F. Cleanup
- Remove leftover `nif_pending_roles` localStorage references anywhere they still appear.
- Delete unused `ai-orchestrator` edge function (superseded by `ai-assistant` + department-specific functions) to reduce confusion.

## Technical details

```text
Login.tsx                    AuthContext.tsx               ProtectedRoute.tsx
   │                              │                                │
   │ signUp(e,p,n,roles) ─────────▶ explicit 4-arg signature       │
   │ lovable.auth.signInWithOAuth ─▶ (no change)                   │
   │                              │  setMemberships + setLoading   │
   │                              │  in same tick                  │
   │                              └────────────────────────────────▶ render if
   │                                                                  isMaintenance ||
   │                                                                  activeRole

useAiAssistant ── body: {context, prompt, data, organization_id} ──▶ ai-assistant
                                                                       │
                                                                       ├─ validateServiceOrUser
                                                                       ├─ try/catch wraps everything
                                                                       └─ all responses include corsHeaders
```

Migration (forward-only, idempotent):
- `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; CREATE TRIGGER ...`
- `INSERT INTO role_assignment_requests SELECT ... FROM auth.users u WHERE NOT EXISTS (memberships) AND NOT EXISTS (pending request)`

No destructive changes; safe to re-run.
