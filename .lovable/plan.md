## Goal
Make sign-in and onboarding deterministic so users never get stuck on **Awaiting Role Assignment** or an endless loading screen, then clean up the code and backend migration path so the issue does not return.

## What I found
- The auth bootstrap in `src/contexts/AuthContext.tsx` is fragile: it mixes `getSession()`, `onAuthStateChange`, async membership fetching, and a timeout-based loading escape hatch.
- The role flow depends on `localStorage` (`nif_pending_roles`) plus a client-triggered `assign-pending-roles` function. That means role intent is not persisted reliably in the backend and can be lost across devices/sessions.
- The current self-assignment path is also risky for a professional approval workflow; it conflicts with the app’s “pending approval” model.
- Migration history looks drifted: the backend has newer applied migration versions than the repository shows, and older migration files contain broad trigger creation / swallowed exceptions that can leave the schema partially updated.

## Plan
### 1. Fix auth initialization and loading guards
- Refactor `AuthContext` to use an explicit auth-ready state instead of relying on timing and fallback timeouts.
- Ensure profile and membership queries only run after the session is fully restored.
- Prevent `ProtectedRoute` from showing the pending-role screen until auth state and membership state are conclusively resolved.
- Remove race-prone patterns that can temporarily produce empty memberships for logged-in users.

### 2. Replace fragile pending-role logic with a proper backend-backed approval flow
- Remove the `localStorage`-based pending role mechanism.
- Add a dedicated backend table for role-assignment requests so requested roles persist correctly across devices and sessions.
- Update signup to write the requested roles to the backend instead of storing them in the browser.
- Update admin/team settings so admins can review and approve queued requests cleanly.
- Keep unassigned users blocked correctly, but only when they are truly unassigned.

### 3. Repair existing stuck users and prevent recurrence
- Add migration(s) to backfill or normalize incomplete onboarding records where possible.
- Make the signup/profile creation path deterministic so every new account gets the expected profile + organization linkage.
- Add safer handling for users with profiles but no memberships, so they land in a clear recoverable state instead of a broken loop.

### 4. Reconcile the failing migration path
- Inspect the live migration state versus the repository state and stop depending on stale/partial historical assumptions.
- Create forward-only corrective migration(s) that:
  - normalize the role-request flow,
  - repair any missing auth/onboarding database pieces,
  - safely add any missing triggers/policies without relying on silent failure blocks.
- Avoid editing auto-generated integration files and avoid touching reserved schemas.

### 5. Remove unnecessary code that causes confusion
- Remove the browser-only pending role storage and related dead branches.
- Remove obsolete fallback logic around self-assignment once the backend queue is in place.
- Prune only code proven to be unused or replaced by the new flow, so nothing important disappears accidentally.

## Technical details
- Frontend files likely affected:
  - `src/contexts/AuthContext.tsx`
  - `src/components/ProtectedRoute.tsx`
  - `src/pages/Login.tsx`
  - `src/pages/PendingApproval.tsx`
  - `src/pages/AppSettings.tsx`
- Backend work likely affected:
  - new migration for persistent role requests / onboarding fixes
  - `supabase/functions/assign-pending-roles/index.ts` (either harden or retire depending on the final secure flow)
- Validation will include:
  - fresh signup
  - verified login
  - unassigned-user flow
  - admin approval flow
  - existing assigned-user login
  - regression check for loading state and route protection

## Expected outcome
- No more false **Awaiting Role Assignment** screens for properly assigned users.
- No more infinite loading caused by auth bootstrap races.
- Role requests persist reliably and can be reviewed professionally.
- Migration failures are addressed with a clean forward fix instead of piling more brittle patches on top.