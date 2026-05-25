
# NIF ERP — Production Stabilization & Restructure Plan

A single, comprehensive pass covering auth/domain correctness, role restructure, full UX/responsiveness audit, notifications, claims storage, geofencing, PWA branding, and performance. Sequenced so each step unblocks the next, with a guaranteed handoff report at the end (even if credits run out).

---

## 1. Auth & Domain Redirect Fix (highest priority)

**Root cause:** Code currently uses `window.location.origin` for `emailRedirectTo` and `resetPasswordForEmail`. On the Lovable preview that returns `*.lovable.app`; on Vercel it returns `nifhdpe.vercel.app`. Supabase Auth's "Site URL" + Redirect Allow List also need the Vercel URL whitelisted.

**Fixes:**
- Introduce a single `getAppUrl()` helper in `src/lib/appUrl.ts` that returns `https://nifhdpe.vercel.app` in production builds (via `import.meta.env.PROD`) and `window.location.origin` only for local dev.
- Replace every `window.location.origin` usage in:
  - `src/pages/Login.tsx` (signup `emailRedirectTo`, password reset `redirectTo`)
  - `src/pages/ResetPassword.tsx`
  - `src/contexts/AuthContext.tsx` (any OAuth `redirectTo`)
  - Any edge function that builds confirmation links.
- Configure Supabase Auth: set Site URL to `https://nifhdpe.vercel.app`, add both `https://nifhdpe.vercel.app/**` and `http://localhost:8080/**` to the Redirect Allow List (via Cloud config).
- Verify: signup, email verify, password reset, magic link, Google OAuth, logout, session restore on refresh, expired token handling.

## 2. Role System Restructure (6 departments)

**Remove:** `siwes_trainee`, `it_student`, `nysc_member`, `knowledge_manager` (replaced by Admin), and any trainee dashboards.

**New canonical role set** (`app_role` enum):
`administrator`, `technical`, `marketing`, `logistics`, `accounts`, `hr`

**Migration plan:**
1. Add new enum values: `technical`, `marketing`, `logistics`, `accounts`.
2. Data migration:
   - `engineer`, `technician` → `technical`
   - `reception_sales` → `marketing`
   - `warehouse` → `logistics`
   - `finance` → `accounts`
   - `siwes_trainee`, `it_student`, `nysc_member` → delete memberships (or convert to `technical` if user wants — confirm).
3. Drop deprecated enum values once memberships migrated.
4. Update RLS policies that reference old roles.

**Code changes:**
- `src/lib/constants.ts` — `ROLE_LABELS` to the 6 new ones only.
- `src/lib/navConfig.ts` — rewrite per the per-department module map below.
- `src/components/dashboards/DashboardRouter.tsx` — map 6 dashboards.
- Rename dashboard files: `TechnicianDashboard`+`EngineerDashboard` → `TechnicalDashboard`; `WarehouseDashboard` → `LogisticsDashboard`; `SalesDashboard` → `MarketingDashboard`; `FinanceDashboard` → `AccountsDashboard`; keep `HRDashboard`, `AdminDashboard`.
- Delete `TraineeDashboard.tsx`, `KnowledgeManagerDashboard.tsx`, `/pages/KnowledgeBase.tsx` if Knowledge Base is being demoted (will confirm — likely keep as Admin-only doc library).
- Remove all references to deleted roles across pages, hooks, edge functions, RLS.

**Per-role module visibility:**

```text
Admin       → everything
Technical   → Dashboard, Projects, Equipment, Field Reports, Claims, HR (check-in), Messages, Notifications
Marketing   → Dashboard, Opportunities, Quotations, Clients, Analytics, Messages, Notifications
Logistics   → Dashboard, Inventory, Logistics, Equipment movement, Messages, Notifications
Accounts    → Dashboard, Finance, Claims (approval), Procurement, Analytics, Messages
HR          → Dashboard, HR (full), Attendance, Claims, Messages, Notifications
```

## 3. Claims Storage & Proof Pipeline

- Verify `claims-proof` bucket exists and is **public-read with authenticated-write** RLS.
- Standardize upload path: `claims/{user_id}/{claim_id}/{filename}`.
- Switch claim proof display to `getPublicUrl` (public bucket) — remove any signed-URL race conditions.
- `generatePdf.ts` for claims: embed proof images via `addImage` after pre-fetching as base64 (await all before `doc.save`).
- Add error toast + retry if upload fails; never leave a claim row without proof_url when proof was required.

## 4. Check-in / Geofencing Hardening

- Centralize haversine in `src/lib/geo.ts`; use meters and round.
- Office coords come from `organizations.office_lat/lng/radius_m` — block check-in if missing (already partly in place).
- Project/site check-in uses `projects.site_lat/lng/geofence_m`.
- Permission UX: explicit "Enable location" CTA when `navigator.permissions` reports `denied` with instructions per OS.
- Strict 5:00 PM checkout rule preserved; surface countdown.
- No coordinate fallbacks — fail loudly, never silently allow.

## 5. Notifications & Unread Counts

- Single source of truth: `useUnreadCounts()` hook reading from `messages` (direct, where `recipient_id = me` and `is_read = false`) + `notifications` table.
- `NotificationBell`, `Messages` page, `AdminDashboard`, mobile `BottomNav` badge all consume that hook.
- Auto-mark-as-read when a conversation is opened (write on mount, invalidate query).
- Realtime: ensure `messages` and `notifications` are in `supabase_realtime` publication; subscribe in the hook.
- Cleanup: nightly cron removes notifications older than 60 days.

## 6. Responsiveness Pass (mobile-first)

Audit at 320 / 375 / 414 / 768 / 1024 widths:
- Tables → convert to stacked cards under `md`; horizontal scroll wrapper otherwise.
- Forms → single column under `sm`, `w-full` inputs, sticky action bar on mobile.
- Dialogs → `max-h-[90dvh] overflow-y-auto`, full-width on mobile.
- PDF previews → responsive `aspect-[1/1.414]` container, pinch-zoom enabled.
- BottomNav: keep to 5 items max, hamburger sheet for the rest (already in place — verify per new role set).
- Sidebar collapse persists in `localStorage`.
- Fix overflow in: Quotations cards, Projects board, Inventory grid, HR tabs, Finance tables.

## 7. PWA & Branding

- `public/manifest.json`: app name "NIF Technical Operations Suite", short_name "NIF Ops", `start_url: "/"`, `display: "standalone"`, `theme_color: #061829`, `background_color: #061829`, icons 192/512 + maskable from `nif-logo.png`.
- Fix manifest 401 (likely caused by Vercel auth wall on preview — ensure it's public).
- Replace all `vite.svg`/Lovable favicons in `index.html` with NIF icons.
- Remove any "Lovable" strings from titles, meta tags, splash, PDFs.
- Service worker (`public/sw.js`): cache shell, network-first for API.

## 8. Performance & Stability

- AuthContext already hardened with try/catch/finally + 8s safety timeout — verify still present after any merges.
- Confirm `App.tsx` lazy-loads every route (already done).
- Add `<link rel="preconnect">` to Supabase URL in `index.html`.
- React Query: keep `staleTime: 60s`, add `placeholderData: keepPreviousData` to paginated lists to remove flashes.
- Wrap heavy dashboards in `Suspense` with skeleton fallbacks (not bare "Loading...").
- Vite `manualChunks` already in place — add `recharts` and `jspdf` to their own chunks.

## 9. Verification Loop

After implementation:
1. `tsc --noEmit` clean.
2. Production build (`vite build`) — inspect chunk sizes, expect <250KB initial JS.
3. Browser tool walkthrough at 375px and 1440px: login → each role's dashboard → key CRUD on each module → claim with proof → check-in → message thread (unread clears) → PDF download.
4. Supabase linter clean (RLS, function search_path).
5. Vercel: confirm `nifhdpe.vercel.app` loads cold and after hard reload.

## 10. Mandatory Handoff Artifact

Regardless of completion state, at the end of this run I will write:

`/mnt/documents/NIF_ERP_HANDOFF.md` containing:
- What was fixed (file-by-file)
- What remains (ordered by priority)
- Root causes discovered
- Schema/RLS/bucket/auth changes applied vs pending
- Exact next files to touch
- Vercel + Supabase config still required
- Test scripts to run

---

## Technical Details (for engineers)

**Files I expect to modify (non-exhaustive):**
- `src/lib/appUrl.ts` (new), `src/lib/constants.ts`, `src/lib/navConfig.ts`, `src/lib/geo.ts` (new)
- `src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`, `src/pages/ResetPassword.tsx`
- `src/components/dashboards/*` (rename + delete trainees)
- `src/components/layout/{AppSidebar,BottomNav,MobileNav,NotificationBell}.tsx`
- `src/hooks/useUnreadCounts.ts` (new)
- `src/pages/WorkerClaims.tsx`, `src/lib/generatePdf.ts`
- `src/components/CheckInWidget.tsx`
- `public/manifest.json`, `index.html`, `public/sw.js`
- `vite.config.ts` (chunk tuning)

**Migrations:**
- Add enum values → backfill memberships → drop old enum values → update RLS policies referencing removed roles.
- Ensure `claims-proof` bucket public, policy for authenticated insert under own folder.
- Drop `knowledge_manager`/`siwes_trainee`/`it_student`/`nysc_member` from any role-check helpers.

**Supabase Auth config:**
- Site URL → `https://nifhdpe.vercel.app`
- Redirect allow list: `https://nifhdpe.vercel.app/**`, `http://localhost:8080/**`, preview lovable URL kept only if user wants dual testing.

---

## Two quick confirmations before I start

1. **Knowledge Base page** — keep as Admin-only doc library, or remove entirely with the deleted trainee roles?
2. **Existing users with deprecated roles** (engineer/technician/warehouse/etc.) — auto-map to the new buckets as I proposed, or wipe their roles and force re-assignment by Admin?

If you say "go" without answering, I'll default to: **keep Knowledge Base (Admin-only)** and **auto-map existing roles** per the table in §2.
