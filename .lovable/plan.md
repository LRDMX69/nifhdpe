# AI Systems Stabilization Plan

## Goal
Make every AI-powered feature in the ERP reliable in preview and published environments, with no silent failures, broken loading states, malformed-response crashes, or partially triggered automations.

## What I will fix

### 1) Build a complete AI surface map
Trace every AI entry point and dependency across:
- client hooks and pages
- edge functions
- scheduled/background automations
- AI summary writes and intelligence logs
- organization/auth checks
- retries, rate limiting, and fallback paths

### 2) Fix the shared backend failure pattern first
Replace the fragile AI edge-function pattern with a hardened shared flow used consistently across the AI stack:
- correct async rate-limit handling in every AI edge function
- unified timeout handling for outbound AI requests
- clear handling for 402, 429, 5xx, empty-body, and malformed-body responses
- safe CORS and error responses on all branches
- consistent structured logging for request start, provider result, fallback usage, parse failures, and database write failures
- strict response consumption so functions do not crash the runtime

### 3) Harden every AI edge function end-to-end
Audit and fix these flows individually:
- `ai-assistant`
- `message-moderation`
- `process-report`
- `department-automation`
- `central-ai-monitor`
- `anomaly-detection`
- `hr-analysis`
- `daily-summary`
- `stock-analysis`
- `opportunity-scanner`
- `auto-mode-runner`
- any remaining AI orchestrator/legacy path that is still reachable

For each one I will verify:
- auth and organization validation
- request validation
- provider call behavior
- JSON/text/stream parsing
- fallback behavior
- database writes
- returned payload shape
- caller compatibility

### 4) Fix client-side AI handling so failures never break UI
Update the frontend AI consumers so they behave safely when AI is slow, empty, rate-limited, or returns unexpected payloads:
- no permanent loading states
- null-safe rendering everywhere AI content appears
- user-friendly error states and retry messaging
- defensive parsing for stream/non-stream responses
- graceful fallback content where appropriate
- no crashes from undefined summaries or malformed AI output

### 5) Verify background automation and scheduled AI jobs
Audit scheduled and internal AI paths so automations actually run and fail visibly:
- auto-mode runner internal function chaining
- cron-triggered flows and service-role authentication
- department automation fan-out
- message moderation background scan path
- central monitoring and summary generation
- opportunity refresh behavior
- any AI log/summary insertion path used for dashboards

### 6) Fix data integrity issues in AI-generated records
Stabilize AI-related database writes and readbacks:
- summary insertion consistency
- intelligence log creation
- duplicate prevention where AI creates records
- organization scoping correctness
- fallback records when AI generation fails but the workflow should still complete

### 7) Add verification coverage
Run a stabilization test pass covering:
- direct function calls
- dashboard-triggered AI actions
- field report processing
- opportunity refresh
- moderation and monitoring flows
- mobile viewport behavior for AI panels
- published-environment-safe behavior for auth-protected AI calls

## Key issues already identified
- A systemic backend bug exists: most AI edge functions call the async rate-limit middleware without `await`. That can corrupt response handling and matches the live `bodyUsed` runtime crash already showing in the AI assistant logs.
- Several AI functions duplicate fragile provider/parsing logic instead of sharing one hardened implementation.
- Some AI flows parse JSON too optimistically and can silently drop malformed model output instead of surfacing safe fallback states.
- At least one automation path appears to use incorrect organization targeting logic and needs end-to-end validation.

## Technical implementation details
- Introduce or refactor toward a shared AI utility layer for provider calls, timeout/retry policy, safe JSON extraction, and error normalization.
- Standardize edge responses so frontend callers can always distinguish success, fallback, retryable failure, rate limit, and auth failure.
- Preserve Lovable AI as the primary provider and only use the existing fallback path when necessary.
- Keep fixes scoped to AI reliability, triggers, and response handling; no unrelated feature work.

## Validation outcome I’m targeting
After implementation:
- AI actions trigger reliably
- background AI jobs run predictably
- AI responses render correctly
- failures are visible and recoverable
- published usage matches preview behavior much more closely
- no AI path can take down a page or leave users stuck indefinitely