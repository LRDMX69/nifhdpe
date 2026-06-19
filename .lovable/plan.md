## Goal

Bring every page of the app to the same high UX bar: every action confirms itself, every empty screen tells you what to do next, every error speaks human, every workflow shows where it is, and any user can send feedback from anywhere.

## Workstreams

### 1. Global "Send Feedback" channel (new feature)

- New `user_feedback` table (category, message, page_url, user_id, org_id, status, admin_reply, created_at). RLS: users insert/read their own; administrators read+reply on org rows.
- Floating `FeedbackButton` mounted in `AppLayout` (bottom-right, above BottomNav on mobile). Opens a sheet with category (Bug / Idea / Question / Other), message textarea, and auto-captured page path.
- Admin inbox at `/settings` → new "User Feedback" in the hidden admin tab so the hidden admins can read, reply, and mark resolved. Reply triggers a notification toast for the user on next load.
- User can see their submitted feedback + hidden admin replies in the same sheet under a "My feedback" tab.

### 2. Action feedback standardization

- Audit every mutation in: Quotations, Clients, Inventory, Projects, Logistics, Field Reports, Finance, Equipment, Compliance, Knowledge Base, Opportunities, HR (all tabs), Worker Claims, Procurement, HSE, Document Registry, Messages, App Settings, Analytics, Dashboard widgets.
- Wrap each in a consistent pattern: optimistic toast on submit → `toast.success("…")` on resolve → `toast.error(humanizeError(err))` on failure. Replace remaining `window.alert` / `console.error`-only paths.
- Add `humanizeError()` helper that maps Postgres + Supabase error codes (`23505` duplicate, `42501` permission, `PGRST*` etc.) to friendly sentences.

### 3. Empty & error states sweep

- Replace every "No data" `<p>` with the shared `EmptyState` component (icon + headline + one-line guidance + primary CTA when applicable).
- Replace every table/list `error` branch with `ErrorState` (icon + sentence + Retry button wired to React Query `refetch`).
- Replace every loading `null` with `LoadingState` skeletons matching the destination layout.

### 4. Workflow status visibility

- Every submission table row gets a `StatusBadge` + a `SubmissionTimeline` mini-strip ("Submitted → Reviewing → Approved/Paid") so users see exactly where they are without opening the record.
- Inbox cards for reviewers show "Waiting on you for X days" pill when SLA exceeded.
- Add a "Status legend" popover next to every workflow page title so terms are explained once.

### 5. Onboarding polish (light)

- Inline hints under primary CTAs on first visit ("This is where you submit claims" etc.) — opt-in via existing `tours.ts` infrastructure, replay button already lives in the Help menu.

## Technical notes

- New DB: `user_feedback` table with grants + RLS as per project standard. Trigger on `updated_at`. Audit log trigger.
- New components: `src/components/feedback/FeedbackButton.tsx`, `FeedbackSheet.tsx`, `FeedbackInbox.tsx`. Mount feedback button once in `AppLayout` so every authenticated route gets it.
- New utilities: `src/lib/humanizeError.ts`, expanded `src/components/ui/empty-state.tsx` usage.
- Each page is touched with a small, surgical diff — replace stringly-typed feedback with the standard helpers. No business-logic changes.

## Out of scope

- No redesign of any page layout, theme, or color tokens.
- No backend logic changes outside the new feedback table and tiny helper functions.
- No changes to RLS on existing tables.
- Joe → Doe maintenance swap is already shipped in the previous turn; not repeated here.

## Rollout order

1. DB migration for `user_feedback` + `humanizeError` helper.
2. Global `FeedbackButton` + sheet wired into `AppLayout`.
3. Admin feedback inbox tab in `/settings`.
4. Sweep pass 1 — high-traffic: Dashboard, Claims, Field Reports, Attendance (HR tab), Messages, Quotations.
5. Sweep pass 2 — workflows: Equipment, Leaves, Procurement (MR + PO), Print Requests, Document Registry, Compliance, HSE.
6. Sweep pass 3 — remaining: Clients, Inventory, Projects, Logistics, Finance, Knowledge Base, Opportunities, Analytics, Settings.
7. Verification: Playwright smoke through 3 representative flows (submit a claim, approve a leave, send feedback) with screenshots.

Approve and I'll start with workstreams 1 → 3 in the first batch and report back before continuing.