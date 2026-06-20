---
name: Auto-Mode Gate for Background AI
description: Cron/service-triggered AI functions skip when org's auto_mode_settings.enabled is false; manual user calls bypass the gate.
type: feature
---
Every scheduled / cron-triggered AI edge function checks `auto_mode_settings.enabled`
for the target organization via `_shared/autoMode.ts` (`isAutoModeEnabled` + `autoModeSkippedResponse`).
If Auto Mode is OFF and the request came via cron / service role (detected with
`isCronOrServiceRequest`), the function returns `{skipped:true, reason:"auto_mode_off"}`
without running AI or spending credits.

Gated functions: opportunity-scanner, central-ai-monitor, daily-summary, hr-analysis,
stock-analysis, message-moderation, anomaly-detection, department-automation.
auto-mode-runner already filters orgs by `enabled=true` upstream.

Always allowed (manual): ai-assistant (Generate Proposal Email, Ask AI panels),
process-report (on-submit field reports), admin "Run now" buttons (authenticated
user requests bypass the cron check), admin-terminate-user, send-push, assign-pending-roles.