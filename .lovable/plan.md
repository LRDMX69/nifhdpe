# System Stabilization & Bug Fix Plan

## Critical Bugs Found

### Bug 1: Inventory Page Crash (WHITE SCREEN)

**Root cause**: `<SelectItem value="">` in Inventory.tsx (lines 250, 258). Radix UI Select does NOT allow empty string values -- this crashes the entire component tree.
**Fix**: Change `value=""` to `value="none"` and handle `"none"` as null in the submit handler.

### Bug 2: Check-In "No location configured"

**Root cause**: The organization record has `office_lat: NULL` and `office_lng: NULL`. The system correctly blocks check-in, but the company's real address coordinates need to be set.
**Fix**: Run a DB migration to set the real coordinates for "30 Oguntona Crescent, Gbagada Phase 1, Lagos" which is approximately `6.5528, 3.3878`. Also improve the error message to guide admins to Settings to configure coordinates.

### Bug 3: Service Worker Fails in Preview

**Root cause**: SW registration runs unconditionally, but Lovable preview iframes redirect `/sw.js`, causing a SecurityError.
**Fix**: Add iframe/preview guard to `initPushNotifications()` in `main.tsx` so SW only registers in production (published URL). Unregister stale SWs in preview context.

### Bug 4: PWA Icons Missing

**Root cause**: `manifest.json` only has a 64x64 favicon.ico. PWA requires 192x192 and 512x512 PNG icons.
**Fix**: Generate proper sized icons dynamically from the org logo, or create placeholder NIF-branded icons. Update manifest with proper icon entries. The splash screen already fetches `organizations.logo_url` and works correctly.

### Bug 5: DB Triggers Show "None" in Config Panel

**Status**: False alarm. Triggers DO exist (verified via `pg_trigger` query). The Lovable config panel display is stale/cached. No fix needed.

## Implementation Plan

### Phase 1: Fix Inventory Crash

- **File**: `src/pages/Inventory.tsx`
- Change `<SelectItem value="">None</SelectItem>` to `<SelectItem value="none">None</SelectItem>` (2 places)
- In `handleSubmit`, convert `"none"` back to `null` for `location_id` and `box_id`

### Phase 2: Fix Check-In System

- **Migration**: FINAL CHECK-IN LOGIC (CLEAN + POWERFUL)
- Step 1: Ask for location permission 📍
- Step 2: Get user GPS
- Step 3: Decide WHICH location applies
- TypeScript
- if (user.assignedProjectLocation) {
-   use project location
- } else {
-   use office location (NIFTECH)
- }
- ✅ Step 4: Validate distance
- TypeScript
- if (distance <= 500m) {
-   allow check-in
- } else {
-   block check-in
- }
- 🎯 What this gives you
- Scenario
- Result
- Office worker
- ✅ Uses NIFTECH
- Site worker
- ✅ Uses project location
- Wrong location
- ❌ Blocked
- 👉 Clean. Smart. Complete.
- **File**: `src/components/CheckInWidget.tsx` -- improve error messaging to tell admins how to fix missing coordinates (Settings page)

### Phase 3: Fix Service Worker Registration

- **File**: `src/main.tsx` -- wrap `initPushNotifications()` with iframe/preview-host guard per PWA guidelines
- **File**: `src/lib/pushNotifications.ts` -- add guard inside `registerServiceWorker()`

### Phase 4: Fix PWA Manifest

- **File**: `public/manifest.json` -- add 192x192 and 512x512 icon entries pointing to the org's logo_url or a generated favicon
- Generate simple NIF-branded PNG icons at required sizes using a canvas script, saved to `public/`
- Update `index.html` apple-touch-icon if needed
- Instead of “generate new logo”, do this:
- ✅ Step 1: Take existing logo
- ✅ Step 2: Place it on a square canvas
- ✅ Step 3: Add padding (20–30%)
- ✅ Step 4: Add solid background (brand color or white/black)
- ✅ Step 5: Export multiple sizes
- 🚀 Pro-level rule (industry standard)
- Asset type
- Should it change logo?
- Brand logo
- ❌ NEVER
- App icon
- ⚠️ Adapt only
- Favicon
- ⚠️ Simplify version
- Splash screen
- ⚠️ Styled version allowed

### Phase 5: Mobile UI Polish

Quick scan and fix of common mobile issues:

- Ensure all pages use `p-4` not `p-6` on mobile
- Fix any horizontal overflow on cards/tables
- Verify dialog forms are scrollable on small screens (most already have `max-h-[90vh] overflow-y-auto`)

### Phase 6: Equipment Request Escalation (already implemented)

The equipment request system already exists with submit, approve/deny flows but the escalation UI (reminder + phone dialer) needs to be added as a lightweight admin action on pending requests.

## Files to Modify

1. `src/pages/Inventory.tsx` -- fix SelectItem crash
2. `src/components/CheckInWidget.tsx` -- improve error messages
3. `src/main.tsx` -- SW guard
4. `src/lib/pushNotifications.ts` -- SW guard
5. `public/manifest.json` -- proper PWA icons
6. Database migration -- set office coordinates
7. Fix and add the escalation ui and work flows 
8. Once done with everything be sure to scan the codebase for any other issues (MANDATORY) YOU MUST:
  Scan entire app
  Detect:
  crashes
  broken buttons
  missing data
  console errors
  Fix ALL immediately.

## Technical Notes

- The Inventory crash is the highest priority as it causes a white screen
- The check-in issue is a data problem (missing coordinates), not a code bug
- Service Worker errors only occur in preview, not in production -- but the guard prevents console noise
- All other pages (Equipment, Finance, HR, Messages, etc.) have working CRUD flows