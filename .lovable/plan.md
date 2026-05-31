# Opportunity Source Tracking & Verification

Make every opportunity traceable: store the originating URL, validate it (HEAD/GET), classify its type, surface the evidence in the UI, lower confidence on unverified sources, and audit existing rows.

## 1. Database migration (new columns + audit table)

Add to `public.opportunities`:

- `source_url text`
- `source_domain text`
- `source_type text` — one of: `procurement_portal | government_portal | company_website | pdf_notice | rss_feed | news_source | manual_entry`
- `source_verified boolean default false`
- `source_status_code int`
- `source_last_checked_at timestamptz`
- `source_verification_notes text`
- `discovered_at timestamptz default now()`
- `needs_review boolean default false`

Index on `(organization_id, source_verified)`.

No new tables — verification history lives in `source_last_checked_at` + `source_verification_notes`.

## 2. Scanner edge function (`opportunity-scanner/index.ts`)

- Extend AI prompt: every opportunity MUST return `source_url`, `source_type`, and the page it was found on. Forbid invented URLs — if not known, return null and the scanner will mark `manual_entry` / unverified.
- After parsing AI response, run `verifySourceUrl(url)`:
  - HEAD request (5s timeout), fall back to GET if HEAD not allowed (405).
  - Follow up to 3 redirects.
  - Verified = final status `200–399` AND final URL host matches expected domain AND body (when GET) doesn't contain "404" / "page not found" / "tender closed" heuristics in `<title>`.
  - Returns `{ verified, statusCode, finalUrl, notes }`.
- Persist: `source_url = finalUrl`, `source_domain = new URL(finalUrl).hostname`, `source_verified`, `source_status_code`, `source_last_checked_at = now()`, `source_verification_notes`.
- If `!verified` → reduce `success_probability` by 20 and `relevance_score` by 1 (floor 0) and set `needs_review = true`.
- If AI omitted URL → save row with `source_type = manual_entry`, `source_verified = false`, `needs_review = true`, confidence reduced.

## 3. New audit edge function (`opportunity-source-audit`)

- Cron-callable + admin-callable.
- Selects all opportunities for the org where `status IN ('identified','bidding')` and (`source_last_checked_at IS NULL` OR older than 7 days OR `source_verified = false`).
- Re-runs `verifySourceUrl`, updates the same columns, flips `needs_review` true when dead.
- Returns `{ checked, verified, dead, flagged }`.

Wire a daily cron entry via migration (`cron.schedule` + `pg_net`) using existing `cron_shared_secret`.

## 4. Frontend (`src/pages/Opportunities.tsx`)

In the opportunity detail dialog, add a **Source Information** section:

```
Source URL:        <a href=… target=_blank>{source_url}</a>
Source Domain:     {source_domain}
Source Type:       {humanized source_type}
Verification:      Verified ✓ (green) | Unverified ✗ (red) | Pending (muted)
Status Code:       {source_status_code ?? "—"}
Last Checked:      {formatRelative(source_last_checked_at)}
Discovered:        {formatDateTime(discovered_at)}
```

Add an **Evidence** sub-block right under it: "Found via {source_type} at {source_domain} on {discovered_at}. Analyzed page: 

&nbsp;

".

On the opportunity card, show a small badge: green "Source verified", amber "Unverified", red "Needs review" when `needs_review`.

Add a manual "Re-verify source" button (admin-only) that calls `opportunity-source-audit` with `{ opportunity_id }`.

## 5. Audit existing records

After migration approval, invoke `opportunity-source-audit` once across all rows (covered by step 3's bulk pass). Rows with no `source_url` get `needs_review = true` so the team can edit them in-place.

URGENT AUTHENTICATION AUDIT

&nbsp;

Issue:

&nbsp;

Users report that "Sign in with Google" results in a 404 page.

&nbsp;

Email/password authentication works, but Google OAuth does not.

&nbsp;

Investigate and fix the entire Google OAuth flow end-to-end.

&nbsp;

Audit:

&nbsp;

1. Supabase Authentication Settings

&nbsp;

- Site URL

- Redirect URLs

- OAuth callback URLs

- Production URLs

- Development URLs

&nbsp;

2. Google OAuth Configuration

&nbsp;

- Authorized JavaScript Origins

- Authorized Redirect URIs

- OAuth Client settings

&nbsp;

3. Frontend OAuth Flow

&nbsp;

- signInWithOAuth()

- redirectTo values

- callback handlers

- session recovery

&nbsp;

Requirements:

&nbsp;

- All Google sign-ins must redirect back to the production Vercel domain.

- No redirects should point to lovable.app.

- No redirects should point to localhost.

- No redirects should point to old environments.

&nbsp;

Add logging for:

&nbsp;

- OAuth start

- Redirect destination

- Callback received

- Session created

- Failure reason

&nbsp;

Test:

&nbsp;

- New user Google signup

- Existing user Google login

- Mobile browser

- Installed PWA

- Desktop browser

&nbsp;

Provide:

&nbsp;

1. Exact root cause found

2. Exact configuration changed

3. Confirmation that Google login works in production

4. Any Supabase dashboard settings that require manual adjustment

&nbsp;

Do not assume the issue is fixed until the full Google OAuth flow has been tested successfully on production.

## Files touched

- New migration (columns + index + cron job)
- `supabase/functions/opportunity-scanner/index.ts` (prompt + verification + persist new fields)
- `supabase/functions/opportunity-source-audit/index.ts` (new)
- `supabase/config.toml` (register new function; `verify_jwt = false` for cron)
- `src/pages/Opportunities.tsx` (detail dialog Source/Evidence section, card badge, re-verify button)

## Out of scope

- No changes to AI provider, rate limiting, or other edge functions.
- No new tables or RLS changes — new columns inherit existing `opportunities` policies.
- Brief PDF export keeps current layout (Source URL appended at end of Contact section only if verified).