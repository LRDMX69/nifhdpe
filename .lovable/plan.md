## Goal
Keep the opportunity engine intact, but make the **Contact Information** and **Submission Instructions** procurement-focused, opportunity-specific, and honest about confidence — in both the AI generation step and the rendered Brief / PDF.

## Where the problem lives
- `supabase/functions/opportunity-scanner/index.ts` — the prompt currently asks for `📞 Contact:` and `📝 How to Apply:` but allows generic fallbacks (careers pages, company homepages).
- `src/pages/Opportunities.tsx` (`parseContactInfo`, brief dialog, PDF section) — passes whatever is in the description straight through to UI and PDF, with no filtering or confidence labelling.

Everything else (cron, ingestion, listing, market summary, RLS) stays unchanged.

## Changes

### 1. Scanner prompt (`opportunity-scanner/index.ts`)
Rewrite ONLY the contact/submission block of the prompt to require:
- **Procurement-specific entities first**: procurement officer name, tender unit, procurement department, project office, branch, or bid coordinator — not generic HR/careers contacts.
- **Allowed sources**: official tender notice, NipeX/e-GP/portal listing for that specific bid, procurement department page, named officer email, dedicated tender phone line, physical bid submission address, bid reference number.
- **Forbidden fallbacks**: generic `careers@`, `info@`, `contact@`, company homepage, "About Us", LinkedIn company page, generic careers portals, recruiter aggregators — these must NEVER be emitted as the contact or submission.
- **Confidence tag** is mandatory. Each block must end with one of:
  `Confidence: Verified` (named officer + specific portal/email/address tied to this tender)
  `Confidence: Estimated` (procurement dept exists but exact bid contact inferred)
  `Confidence: Not Available` (nothing opportunity-specific found)
- When confidence would be `Not Available`, emit exactly:
  ```
  📞 Contact: Specific submission information was not publicly available at the time of analysis.
  Confidence: Not Available
  📝 How to Apply: Specific submission information was not publicly available at the time of analysis.
  Confidence: Not Available
  ```
- Cross-validation rule in the prompt: contact and submission must both reference the same tender / branch / department; do not mix details across opportunities.

No other prompt sections, no schema changes, no DB changes.

### 2. Frontend sanitizer + confidence parsing (`src/pages/Opportunities.tsx`)
Extend `parseContactInfo` (handles both new AI output AND legacy rows already in DB):
- Parse optional `Confidence: Verified|Estimated|Not Available` line that follows each marker.
- Run a **generic-fallback detector** on the contact and submission strings. If the value matches any of:
  - URL containing `/careers`, `/about`, `/contact-us`, `linkedin.com/company`, bare homepage like `https://company.com/` with no path
  - email starting with `careers@`, `info@`, `hello@`, `hr@` (only when no procurement/tender keyword is also present)
  - phrases "see careers page", "visit our website", "check website"
  → replace value with `Specific submission information was not publicly available at the time of analysis.` and force confidence to `Not Available`.
- Default confidence to `Estimated` when missing but value looks specific.

Return shape becomes `{ contact, contactConfidence, submission, submissionConfidence, cleanDesc }`.

### 3. Brief dialog + cards UI
- Render a small badge next to each label: green `Verified`, amber `Estimated`, muted `Not Available`.
- Suppress the contact line on list cards when confidence is `Not Available` (keeps cards clean).

### 4. PDF export (same file, `generatePdf` call site)
- Append confidence to each section heading body, e.g.:
  ```
  Contact Information (Verified)
  <value>
  ```
- When `Not Available`, still include the section with the standard "not publicly available" sentence so the printed brief is explicit instead of silently omitting.

## Out of scope
- Cron schedule, RLS, scanner architecture, market_summary, listing query, opportunity insert/update, other edge functions.
- No DB migration — confidence lives inside the existing `description` text and is parsed client-side, which also retroactively improves already-ingested rows.

## Files touched
- `supabase/functions/opportunity-scanner/index.ts` (prompt block only)
- `src/pages/Opportunities.tsx` (`parseContactInfo`, dialog render, PDF sections, card render)
