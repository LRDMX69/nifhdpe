# Production cleanup & stabilization plan

Scoped to the concrete, verifiable items from your message. Big "audit everything" sweeps that were already covered by batches 1–6 are not re-run here — they remain green. This plan only touches what is actually broken or explicitly requested.

---

## 1. Fix "Forbidden" when terminating a user (root cause confirmed)

**Diagnosis:** `admin-terminate-user` is not registered in `supabase/config.toml`, so it inherits `verify_jwt = true`. The frontend `fetch()` in `src/pages/AppSettings.tsx` sends only `Authorization`, no `apikey` header → the Supabase Functions gateway rejects the call before any code runs. Edge logs confirm: only boot entries, zero request entries. The function itself already does proper auth via `admin.auth.getUser(token)` and maintenance-admin check, so gateway JWT verification is redundant.

**Fix:**

- Add `[functions.admin-terminate-user]` block to `supabase/config.toml` with `verify_jwt = false` (same pattern as `auto-mode-runner`, `message-moderation`, etc.).
- No code change to the function needed — its in-code auth is correct.
- Verify by terminating "cullian" again after deploy.

---

## 2. Wipe ALL operational data (keep only beta-tester accounts + maintenance admin)

You confirmed: every current user is either you or a beta tester — keep them all. Delete only the operational records they created during testing.

**One migration that TRUNCATEs the following tables (CASCADE where needed), in dependency order:**

Operational data:

- `projects`, `project_materials`, `project_updates`, `project_risk_scores`
- `quotations`, `quotation_items`, `invoices`, `invoice_items`, `payments`
- `clients` (re-added by Marketing as real customers come in)
- `inventory_items`, `inventory_movements`, `equipment`, `equipment_requests`
- `field_reports`, `report_attachments`
- `worker_claims`, `claim_attachments`
- `attendance_records`, `leave_requests`, `payroll_records`, `disciplinary_records`, `performance_reviews`, `promotions`, `recruitment`, `skills`, `training`, `id_cards`
- `expenses`, `vendor_payments`, `procurement_orders`
- `waybills`, `logistics_movements`
- `documents`, `print_requests`, `knowledge_base_articles` (re-seeded by Admin)
- `opportunities`, `compliance_records`, `hse_records`
- `messages`, `conversations`, `broadcast_messages`, `context_messages`
- `notifications`
- `audit_logs` (fresh start)
- `ai_*` log/result tables (anomaly findings, monitor logs, automation results)

**Explicitly NOT touched:** `auth.users`, `profiles`, `organizations`, `organization_memberships`, `system_maintenance_accounts`, `role_assignment_requests` (pending only), `holidays`, `office_locations`, `app_settings`, `document_sequences` (reset counters separately).

Exact table list will be confirmed against `information_schema` before the migration runs; I'll show you the final list in the migration description for approval.

---

## 3. AI report processing — strict "editor only" behavior

**Files to update:** `supabase/functions/process-report/index.ts` (primary), plus any other function that rewrites user-authored text (`hr-analysis`, `daily-summary` for narrative sections).

**New system prompt (locked):**

> You are a professional copy editor. Your ONLY job: fix grammar, spelling, and clarity while preserving the author's exact meaning and facts. You MUST NOT add: recommendations, next steps, suggestions, conclusions, business advice, assumptions, interpretations, predictions, or any content the author did not state. If the input is one sentence, the output is one sentence. Output ONLY the cleaned text, no preamble.

**Post-processing guard:** reject AI output if it contains banned phrases (`next step`, `recommend`, `should consider`, `suggest`, `it is advisable`, `going forward`, `assumption`, `conclusion`, `in summary`, `to address this`). On rejection: fall back to a minimal grammar pass or return the original text unchanged. Log the rejection to `ai_monitor_logs` (hidden from users).

The report system still needs one more important refinement:

&nbsp;

1. When a user submits a report, the system must automatically insert:

&nbsp;

- The user’s full name

- Their role/title

- Department

- Current date and time

- Correct client/project name

&nbsp;

The AI must NEVER leave placeholders like:

[Client Name - TBD]

&nbsp;

and it must NEVER mix up client names between reports. The project/client attached to the report must always match the actual selected project.

&nbsp;

2. Admins should only see the clean processed version of the report while the original sender can still access their raw version privately.

&nbsp;

3. HR ID Card System Improvements:

   When HR generates an ID card for a worker:

&nbsp;

- The system should automatically pull the worker’s existing profile data

- Auto-fill:

  - Full name

  - Department

  - Role

  - Staff ID

  - Phone number

  - Email

  - Profile picture (if available)

&nbsp;

HR should also have the option to manually upload or replace the user photo.

&nbsp;

4. ID Card Logic:

   The system must support:

&nbsp;

- Permanent ID Cards

- Temporary ID Cards

&nbsp;

If temporary is selected:

&nbsp;

- HR sets the expiration date manually

&nbsp;

If permanent is selected:

&nbsp;

- No expiration date should appear

&nbsp;

Permanent ID cards remain valid until:

&nbsp;

- Employee resignation

- Termination

- Manual deactivation by HR/Admin

&nbsp;

5. UI/UX Requirements:

&nbsp;

- ID card generation page must be fully mobile responsive

- Generated cards should look modern, professional, and company-standard

- PDF export and print layout must remain perfectly aligned on mobile and desktop

- Prevent text overflow or broken layouts for long names or titles

&nbsp;

6. Final Requirement:

   Thoroughly test every flow related to:

&nbsp;

- Report creation

- AI processing

- Client/project mapping

- HR profile data retrieval

- ID card generation

- PDF export

- Mobile responsiveness

&nbsp;

Fix every issue immediately and ensure production-level stability before deployment.

---

## 4. Raw vs cleaned report visibility

**Schema:** `field_reports` already stores both `raw_content` and `cleaned_content` (verified). What's missing is the access rule.

**Changes:**

- RLS policy on `field_reports`: SELECT of `raw_content` allowed only when `auth.uid() = submitted_by` OR maintenance admin. Implemented via a view `field_reports_visible` with `security_invoker=on` that hides `raw_content` unless the caller is the submitter; everyone else queries this view.
- Frontend (`src/pages/FieldReports.tsx`, `src/components/dashboards/*` report cards, admin inbox): always render `cleaned_content`. Add a "View original (your submission)" toggle that only appears when `report.submitted_by === user.id`.
- Remove any UI surface showing AI reasoning, prompts, model names, or processing metadata (e.g. `ai_processing_meta` debug pane if present).

---

## 5. Role/department label cleanup (UI only — no DB enum changes)

Memory says 11-role system; you want six departments. The DB enum stays (already mapped in `src/lib/constants.ts`), but UI shouldn't expose I.T., SIWES, NYSC anywhere.

- `src/lib/constants.ts`: `DEPARTMENTS` already correct. Verify and remove any leftover labels in `ROLE_LABELS`, signup role picker, admin role-assignment dropdowns.
- Grep for literal strings `SIWES`, `NYSC`, `I.T.`, `IT Student`, `Knowledge Manager` (if shown) and replace/remove.
- Existing memberships with legacy roles (`siwes_trainee`, `it_student`, `nysc_member`, `knowledge_manager`) are silently mapped to Technical Dept. / Administrator via existing mapping — no migration needed unless you want me to also UPDATE those rows to canonical values (ask before doing it).

---

## What this plan deliberately does NOT do

- **No new sweeping "audit every page" pass.** Batches 1–6 already confirmed auth, AI gateway, RLS, PDF, PWA, realtime, loading states are healthy. Re-running them would consume effort without changing anything. If a specific page misbehaves after the cleanup, point me at it and I'll fix it surgically.
- **No UI redesign.** You called out "feels clustered" but didn't name a specific page; without a target I'd be guessing. Tell me which screen feels off after the data wipe (empty states will look very different) and I'll polish it.
- **No removal of beta-tester accounts** — you said keep them.

---

## Order of execution once you approve

1. Patch `supabase/config.toml` → deploy → verify terminate works on "cullian".
2. Confirm final table list, run the wipe migration.
3. Update `process-report` (and siblings) with locked editor prompt + output guard → deploy → test with the "Generator overheating" example.
4. Add `field_reports_visible` view + RLS + frontend toggle.
5. Sweep UI for legacy role labels.

Each step is independently verifiable; if any fails you'll see it before the next runs.