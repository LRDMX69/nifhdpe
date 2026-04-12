# Code Audit — nifhdpe

This file contains a systematic audit of the repository. Each issue includes: severity, type, location (file path), excerpt or function reference, and remediation recommendation.

---

## Executive summary
- Performed automated pattern scans and targeted file inspections across frontend, backend functions, and DB migrations.
- Major risks: AI prompt injection and missing input validation in edge functions; weakened TypeScript safety; client-side token persistence (localStorage exposure to XSS); minimal test coverage.
- Actions taken: created this `CODE_AUDIT.md` and `ANALYSIS.md` with high-level findings.

---

## Scanning methodology
- Searched for risky patterns: `LOVABLE_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `localStorage`, `eval`, `dangerouslySetInnerHTML`, `innerHTML`, `console.error|console.log`, `TODO|FIXME`, `noImplicitAny`, `noUnusedLocals`, `setInterval`/`setTimeout`, `addEventListener` without cleanup, `eslint-disable`.
- Manual inspection of key files: `supabase/functions/ai-assistant/index.ts`, `src/contexts/AuthContext.tsx`, `tsconfig.json`, migrations, `vite.config.ts`, `package.json`.

---

## Critical issues

- Issue: AI prompt injection / unvalidated AI inputs
  - Severity: Critical
  - Type: Security risk (input validation / data exfiltration / content poisoning)
  - Location: `supabase/functions/ai-assistant/index.ts` (call flow in `serve(...)` and `callGemini`) — lines ~66-115 show direct concatenation of `data` into `userMessage` and unconditional forwarding to 3rd-party AI services.
  - Evidence: code builds `userMessage` with `JSON.stringify(data)` and `prompt` and forwards to Lovable/Gemini without sanitization or schema validation.
  - Risk: Maliciously crafted `data` or `prompt` can cause the AI to produce unsafe outputs, leak structured data, or be used to craft social-engineered responses. If logged or included in other documents, PII or secrets could leak.
  - Recommendation: Implement strict input validation and allowlist schemas for `data` and `context` before sending to AI; sanitize/strip potential injection markers; add maximum size limits; apply server-side prompt templates with placeholder substitution rather than string-concatenation of raw user content.

- Issue: Service role key usage without explicit guard/rotation policy
  - Severity: Critical
  - Type: Security risk (secrets management)
  - Location: `supabase/functions/*` — Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") used in multiple functions (grep matches across `supabase/functions/*`), e.g., `stock-analysis/index.ts` and `process-report/index.ts` (lines ~54-60).
  - Evidence: functions create a supabase client using the service role key for privileged DB ops.
  - Risk: If an edge function is misconfigured or a secret is leaked, attackers gain full DB access. Service role keys should never be exposed to untrusted contexts and must be rotated and scoped.
  - Recommendation: Ensure functions are deployed with secrets in environment (not checked into repo), minimize use of service role key only when necessary, and log/monitor its usage; implement short-lived secrets or server-side vault integration.

- Issue: Client-side session persistence / potential XSS token theft
  - Severity: Critical
  - Type: Security risk (XSS -> token theft)
  - Location: `src/contexts/AuthContext.tsx` and `src/integrations/supabase/client.ts` (supabase-js persists session in localStorage by default). In `AuthContext` the app relies on `supabase.auth.getSession()` and onAuthStateChange; `signUp` uses `window.location.origin`.
  - Evidence: supabase-js stores JWT in localStorage (library default). `AuthContext` code does not set Content Security Policy nor show XSS mitigations.
  - Risk: XSS vulnerability could allow attackers to exfiltrate JWTs and hijack sessions.
  - Recommendation: Add CSP headers, ensure React escapes untrusted HTML, consider storing session in httpOnly cookies via proxy/server if higher security is required, and sanitize all user-driven HTML or markdown before rendering.

---

## Major issues

- Issue: Weak TypeScript configuration reducing compile-time guarantees
  - Severity: Major
  - Type: Maintainability / correctness
  - Location: `tsconfig.json` — lines 3-13 show `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`, `strictNullChecks: false`.
  - Evidence: `tsconfig.json` content: `"noImplicitAny": false` (line 4), `"noUnusedLocals": false` (line 5), `"strictNullChecks": false` (line 13).
  - Risk: Type errors may go unnoticed until runtime, leading to subtle bugs, regressions, and decreased maintainability.
  - Recommendation: Tighten TypeScript flags incrementally: enable `noImplicitAny`, `noUnusedLocals`, `strictNullChecks`; fix resulting errors. Use `tsc --noEmit` in CI to enforce.

- Issue: Minimal test coverage
  - Severity: Major
  - Type: Maintainability / reliability
  - Location: `src/test/example.test.ts` only; `vitest.config.ts` present but few tests exist.
  - Evidence: repository contains a single example test file.
  - Risk: Regressions undetected; deployment may break critical flows.
  - Recommendation: Add unit tests for `useAuth`, `useAiAssistant`, and critical pages (Login, Quotation CRUD); add integration tests for RLS enforcement; add E2E tests with Playwright/Cypress.

- Issue: AI rate-limiting implemented in memory in functions
  - Severity: Major
  - Type: Security / reliability
  - Location: `supabase/functions/_shared/rateLimit.ts` (in-memory rate limiting) used by AI functions
  - Evidence: file exists and AI functions call `rateLimitMiddleware(req, RATE_LIMITS.AI_FUNCTION)`.
  - Risk: In-memory rate limiting on serverless platforms may not be cluster-safe and can be circumvented; attacker could bypass limits if functions scale to multiple instances.
  - Recommendation: Use centralized rate-limiting (Redis, Supabase's Edge Function config with quotas) or rely on API gateway/rate limiting at infrastructure level.

- Issue: Unbounded client-side PDF generation (jsPDF)
  - Severity: Major
  - Type: Performance
  - Location: `src/lib/generatePdf.ts` (single-file utility)
  - Evidence: jsPDF used on client to render complex PDFs (tables, images). Large PDFs can block the main thread.
  - Risk: Large PDFs freeze UI; mobile devices may crash; poor UX during generation.
  - Recommendation: Move heavy PDF generation to edge function (server-side) or use Web Worker to offload generation from main thread.

- Issue: Inconsistent error handling and logging
  - Severity: Major
  - Type: Maintainability / observability
  - Location: Multiple files (grep: many `console.error` and some `catch { }` without logging) — e.g., `ai-assistant` catch returns generic error with console.error and returns 500 with opaque message.
  - Evidence: `ai-assistant` returns generic fallback message; other catches swallow errors silently (e.g., `AuthContext.fetchUserData` catch block is empty).
  - Risk: Hard to debug production issues; silent failures may cause partial state inconsistencies.
  - Recommendation: Standardize error handling: structured error logs, Sentry integration, and avoid swallowing exceptions; return safe, informative errors to clients and log details server-side (redact secrets).

---

## Minor issues

- Issue: Console logging left in production code
  - Severity: Minor
  - Type: Maintainability
  - Locations: many files contain `console.log`/`console.warn`/`console.error`; grep returned multiple matches across `supabase/functions/*` and `src/`.
  - Recommendation: Replace console logs with structured logger (pino/winston) and filter in production; remove stray debug logs.

- Issue: Magic strings and repeated literals
  - Severity: Minor
  - Type: Maintainability
  - Location: repeated `organization_id`, `administrator`, role names across codebase (e.g., `src/contexts/AuthContext.tsx`, `supabase/migrations/*`).
  - Recommendation: Centralize role and column names in `src/lib/constants.ts` and the DB constants schema.

- Issue: Potentially large list queries without pagination
  - Severity: Minor
  - Type: Performance
  - Location: pages like `Inventory.tsx`, `Clients.tsx`, `Projects.tsx` (search for `from('inventory')` or `select('*')` without `limit` in pages).
  - Recommendation: Enforce pagination and server-side limits; use `range()` with PostgREST; implement cursor-based pagination where appropriate.

- Issue: Loose ESLint / rule suppressions
  - Severity: Minor
  - Type: Code style
  - Location: project-level eslint config allows relaxed rules; some files may use `eslint-disable` inline.
  - Recommendation: Tighten linting rules and enforce in CI.

- Issue: No CSP or security headers defined in app
  - Severity: Minor
  - Type: Security
  - Location: `index.html` and service worker files; no meta CSP tags found.
  - Recommendation: Add CSP meta tags or configure reverse-proxy to set security headers (CSP, X-Frame-Options, X-Content-Type-Options).

- Issue: Marked TODO / FIXME comments
  - Severity: Minor
  - Type: Maintainability
  - Location: Multiple files (grep found `TODO|FIXME` matches). Ensure these are tracked in issue tracker.

---

## Evidence summary (automated grep highlights)
- AI env access: numerous matches for `Deno.env.get("LOVABLE_API_KEY")` & `GEMINI_API_KEY` in `supabase/functions/*` (multiple files) — indicates consistent pattern across AI functions.
- Service role key references: `SUPABASE_SERVICE_ROLE_KEY` occurrences in many edge functions (e.g., `stock-analysis/index.ts`, `process-report/index.ts`, `auto-mode-runner/index.ts`).
- TypeScript config: `tsconfig.json` contains weak flags at lines 3-13.
- Tests: `src/test/example.test.ts` only.

---

## Prioritized remediation plan
1. Security hardening (Critical) — immediate (1-3 days):
   - Add input validation for all edge function endpoints that accept `prompt` or `data`.
   - Audit RLS policies and storage buckets in Supabase console.
   - Ensure service role key is stored only in environment and rotate keys.
   - Add CSP and sanitize any HTML rendering.
2. Correct TypeScript & linting (Major) — next sprint (1-2 weeks):
   - Enable `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, fix compile errors.
   - Enforce linting in CI.
3. Observability & error handling (Major) — next sprint:
   - Integrate Sentry; standardize error logs; stop swallowing exceptions.
4. Performance (Major/Minor):
   - Move heavy PDF generation to server/worker; add pagination; lazy-load images/components.
5. Tests (Major):
   - Create unit tests for `AuthContext`, `useAiAssistant`, edge function contract tests; add E2E flows.

---

## Appendix: Key file references
- `tsconfig.json` (lines 1-20) — weak TS flags
- `src/contexts/AuthContext.tsx` (entire file) — session & membership logic; potential missing error logging and no CSP protections
- `supabase/functions/ai-assistant/index.ts` (lines ~66-120) — AI request flow and `Deno.env.get(...)` usage
- `supabase/migrations/20260409064643_4a6abb1e-5468-4630-946a-a1a74d732a7b.sql` — RLS policy adjustments for `field_reports`

---

If you'd like, I can now:
- Run `npm audit` and produce a dependency vulnerability report,
- Produce a more exhaustive per-file line-numbered CSV of issues (this will take longer), or
- Begin implementing a prioritized remediation (e.g., add input validation to `ai-assistant`).

