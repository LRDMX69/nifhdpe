## Goal

The boss and his team will pilot the ERP for **3 months**. Make every core flow obvious, polished, and self-explanatory. Stretch the pre-funded AI credits to last the full pilot. Zero "where do I click?" moments.

---

## 1. Invoice discoverability (the issue today)

Today invoices only appear after a Quotation is marked *Accepted*. The boss searched for "Create Invoice" and gave up.

- Add a prominent **"+ New Invoice"** button on `Finance → Invoices` tab.
- Open a dedicated `InvoiceDialog` (mirrors QuotationDialog) with: client picker, line items (description/qty/unit), tax %, due date, notes. Auto-generates `INV/YYYY/####` via `next_doc_number`.
- Also add **"Convert to Invoice"** action on every Quotation row (not only on status change).
- Add an `Invoices` quick-action card on AdminDashboard + MarketingDashboard ("Create Invoice" CTA).
- Sidebar: add an **Invoices** link under Accounts pointing to `/finance?tab=invoices`.

## 2. End-to-end flow QA (every flow the boss touched)

Walk each flow live in the preview and fix any friction. For each: visible CTA, empty-state copy, success toast, refresh, mobile layout.


| Flow                                          | Acceptance                                         |
| --------------------------------------------- | -------------------------------------------------- |
| Login → Dashboard                             | <3s cold, no infinite loader, correct role landing |
| Create Client → Quotation → Invoice → Payment | All reachable in ≤2 clicks from Dashboard          |
| Submit Field Report (with photo + GPS)        | Visible in Admin inbox immediately                 |
| Worker Claim with proof                       | Image renders in admin view + PDF embeds it        |
| Check-In / Check-Out                          | 5 PM rule, geofence message clear                  |
| HR: ID Card, Payroll, Leave                   | Generate PDF, no crash, naira formatting           |
| Inventory: add item, deduct, find by rack     | Quick Find returns location                        |
| Equipment Request                             | Reaches admin, status updates                      |
| Messages                                      | Unread badge clears, realtime delivery             |
| Print Request                                 | Reception inbox shows pending                      |
| Knowledge Base                                | Admin can add module, others read-only             |
| PWA install on Android                        | Manifest 200, installs as "NIF Operations"         |


Fix any breakage discovered. Replace generic empty states with action-oriented copy ("No invoices yet — **Create your first invoice**").

## 3. AI budget throttling (last 3 months on current top-up)

Today crons fire every 30 min → ~1,440 AI calls/month per cron job. Reduce safely:

- `auto-mode-runner` cron: **every 30 min → every 4 hours** (6 runs/day instead of 48).
- `opportunity-scanner` cron: **every 10 min → every 6 hours**.
- `central-ai-monitor`, `department-automation`, `daily-summary`: collapse into a **single daily 8 AM run**.
- Switch all background jobs from `google/gemini-2.5-pro` → `**google/gemini-2.5-flash-lite**` (~10× cheaper, sufficient for summaries/anomaly flags).
- User-triggered AI (assistant, report processing, quotation suggestions): keep `gemini-2.5-flash` (good quality, low cost).
- Add a hard daily cap in each edge function: skip if `ai_summaries` for today already exists for that context.
- Surface graceful messages on 402/429 instead of silent failure ("AI is taking a short break — results will resume shortly").

## 4. Document & PDF polish

Every PDF the boss might hand a client must look enterprise-grade.

- **Quotations / Invoices / Waybills / ID cards**: consistent header (org logo + name + RC + address + phone), footer (page x/y, signature block, stamp), naira currency, A4 margins.
- Embed proof images in claim PDFs (pre-fetch → base64 → `addImage`).
- "Print Preview" before download on all generators.
- Add a watermark `DRAFT` until status flips to sent/approved.

## 5. Reports & Claims polish

- FieldReports admin inbox: card view with photo thumbnail, project, technician, AI summary excerpt, "Open full report" action.
- WorkerClaims: required proof attachment, AI timestamp validation surfaces inline error, admin one-click approve/reject with reason.
- Both: filter chips (Today / This week / Pending / All).

## 6. Navigation & discoverability

- Add a **global ⌘K command palette** (cmdk already installed) on every page: "Create invoice", "New quotation", "Add client", "Submit report", "Check in", etc. Solves "I can't find X".
- Dashboard: replace abstract stat cards with a **Quick Actions** row (6 big buttons) for the most-used creates.
- Bottom nav (mobile): pin Dashboard / Quick Create (+) / Messages / Claims / More.

## 7. Performance & smoothness

- Verify cold load <2s on Vercel (route-level lazy already in place, confirm splash ≤1.1s).
- Add `placeholderData: keepPreviousData` to paginated lists (Quotations, Invoices, Reports, Claims).
- Wrap heavy dashboards in `Suspense` skeletons.
- Audit and remove any `console.log` noise in production.

## 8. Final verification loop

- `tsc --noEmit` clean
- Manual walkthrough of every flow in §2 at 1440px **and** 390px
- Supabase linter: no new criticals
- Confirm new cron schedules in `cron.job`
- Confirm Vercel build: bundle <600 KB initial, manifest 200, sw.js 200
- Smoke test on real phone via `nifhdpe.vercel.app`

---

## Technical notes (engineer-only)

**Files to create**

- `src/components/finance/InvoiceDialog.tsx` — full create/edit form
- `src/components/CommandPalette.tsx` — global cmdk launcher, mount in `AppLayout`
- `supabase/migrations/<ts>_throttle_ai_crons.sql` — `cron.unschedule` + re-schedule at new intervals

**Files to edit**

- `src/pages/Finance.tsx` — `+ New Invoice` button, tab deep-link via `?tab=`
- `src/pages/Quotations.tsx` — row action "Convert to Invoice"
- `src/lib/navConfig.ts` — add `Invoices` entry
- `src/components/dashboards/AdminDashboard.tsx`, `SalesDashboard.tsx`, `FinanceDashboard.tsx` — Quick Actions row
- `src/lib/generatePdf.ts`, `generateWaybill.ts`, `generateIdCard.ts` — unified header/footer, draft watermark
- All `supabase/functions/*` background jobs — switch model to `flash-lite`, add daily-skip guard, return graceful 402 messages
- `src/pages/FieldReports.tsx`, `WorkerClaims.tsx` — filter chips + improved cards
- `src/components/layout/AppLayout.tsx` — mount CommandPalette, ⌘K shortcut

**Cron new schedule**

```text
auto-mode-runner       0 */4 * * *     (every 4h)
opportunity-scanner    0 */6 * * *     (every 6h)
daily-digest           0 8 * * *       (once daily, replaces 3 separate jobs)
```

**Budget math:** ~30 background AI calls/day × 90 days × flash-lite ≈ well within the topped-up balance, leaving headroom for user-triggered AI.

---

## Open question

Just one before I start: **the boss said all AI features weren't working today** — was that strictly because credits were exhausted (now topped up), or did you also see specific AI features error out (e.g. report processing, assistant chat)? If the latter, name them and I'll prioritize fixing those first. Otherwise I'll assume credits-only and proceed with the full plan above.i think it was only because of credits but do you ill test everything out again and see if ut all works out fine