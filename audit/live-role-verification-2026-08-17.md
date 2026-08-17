# Live role verification — 2026-08-17

## Initial deployment check

The live URL `https://nifhdpe.vercel.app/dashboard` loaded successfully in the maintenance session. The Administrator preview shows the role switcher and the compact `Start with the business priorities` quick-start before the executive command-center content. The page reports a cleared-data state with live empty metrics except for the existing opportunity count (643), and no data mutation was performed.

At this first check, the live page did not yet contain the new `Detailed administrator oversight` disclosure text from commit `0f558e5`; the existing Administrator analytics were still visible. This suggests the Vercel deployment had not yet propagated or was still serving the prior production build. Recheck after propagation before final certification.

## Local repository QA setup

The repository build passes the configured environment guard once the non-committed `.env.local` is derived from `.env.production`. The local build then presents the normal sign-in screen rather than the production browser’s persisted maintenance session. No business-data write was attempted. Local role verification therefore requires reusing the already authorized maintenance account/session or an explicitly supplied login step; the QA scope remains read-only apart from authentication.

## Local Administrator verification

After signing in with the existing maintenance account, the current repository build showed the Administrator role preview correctly. The first visible work is `Start with today’s overview` with three clear links: review today’s overview, review financial position, and manage people and access. The live cleared-data snapshot follows, and the previous long executive analytics block is now secondary behind `Detailed administrator oversight` with the `Open detailed oversight` trigger. No write action was taken.

## Mobile role-matrix evidence so far

At a Playwright viewport of exactly 390×844, the current repository build showed the Administrator task links before the executive command center, the Technical Dept. links `Open today’s assignments`, `Submit a field report`, and `Request equipment` before `My Assignments`, and the Logistics links `Check inventory`, `Plan a delivery`, and `Review purchases` before `Warehouse Overview`. For each measured dashboard, `window.innerWidth`, `document.documentElement.scrollWidth`, and `document.body.scrollWidth` were all 390px, so no horizontal overflow was observed. The browser console showed existing application errors/warnings from the local session that are being recorded separately; no business-data write was performed.

The Accounts preview at 390×844 showed `Review Finance`, `Review procurement`, and `Open analytics` before `Financial Overview`, with 390px document and body scroll widths. The layout is contained and the first-use actions are explicit.

The HR preview at 390×844 displayed `Your HR workspace`, `HR Dashboard`, and `Start your HR work` with attendance, leave, and payroll actions before the deeper HR-plus-finance command center content. The centralized view is therefore attached to the HR role dashboard rather than Administrator. Scroll widths remained exactly 390px.

The Marketing preview at 390×844 showed `Review opportunities`, `Create a quotation`, and `Open clients` before the `Sales & Reception` dashboard content. Its live opportunity count is part of the role content, and the page remained exactly 390px wide with no horizontal overflow.

The Knowledge Manager preview at 390×844 showed `Start with a knowledge task` with links to the document registry, HR learning, and messages before the recent-articles area. The role did not receive a duplicated generic attention queue, and its scroll widths remained exactly 390px.

The Trainee Dept. preview at 390×844 showed `Start your learning path` with `Submit a reflection`, `Practice calculations`, and `Review company documents` before progress and reflection history. Its measured document and body scroll widths were 390px.

## Console notes

The local Playwright session reported four errors after the role matrix pass: a notification-permission request made outside a short user event, two Supabase Realtime Cloudflare cookie-domain warnings, and one syntax error caused by a malformed read-only measurement probe during QA. The role-switching and dashboard rendering remained functional. These console entries were not introduced by the committed dashboard layout changes and no new application exception was observed while switching roles.
