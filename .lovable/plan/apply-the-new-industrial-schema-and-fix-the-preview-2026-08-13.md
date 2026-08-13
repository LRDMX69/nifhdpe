# Apply the new industrial schema and fix the preview

## What I found

Your local changes added four unapplied database migrations (dated Aug 13) plus UI that already uses them. The database does not have any of the new tables yet, so the pages that reference them fail at runtime:

- Pages already calling the new tables: Projects, Quotations, Field Reports, Logistics, Opportunities, Invoice dialog, Client detail.
- Missing tables include sales orders and items, product specifications, inventory reservations, stock movements, work packages, fusion joints, handover records, warranty assets, service tickets, business audit events, management configuration, procurement demands, delivery items, material consumptions, equipment assignments, QA records, service ticket parts (19 in total).

Two real problems in those migration files:

1. **No table-level permissions.** All 19 new tables enable row-level security and create policies, but none of them grant table access to signed-in users. Without the grants every read and write returns a permission error even with correct policies — the pages would still look broken after the tables exist.
2. **Order dependency.** The later files add columns and functions that reference the new tables, so they must run in date order.

On the preview: the environment values you pasted are already correct in the project (`https://pxuqddhgbkjwykeirkmz.supabase.co` and the same publishable key). Note the URL you pasted ends in `.cO` — that is only a typo in the message, the stored value is correct. So the preview problem is not a missing key; it is almost certainly the missing tables causing errors on load. I will confirm in the browser after the migrations run.

## What I will do

1. Apply the four migrations in order:
   - industrial workflow foundations (new core tables, RLS, workflow functions)
   - complete transaction connectors (links between orders, deliveries, stock, projects)
   - commercial and finance completeness (quotation/invoice fields, period report, invoice-from-order)
   - BOQ specification connectors
2. Add the missing access grants for all 19 new tables in the same run, so signed-in users can actually read and write them and background jobs keep working.
3. Regenerate the database type definitions afterwards and remove the temporary `industrialDb` escape hatch where it is no longer needed.
4. Load the app in a browser, sign in, and walk the affected pages (Projects, Quotations, Opportunities, Logistics, Field Reports, Finance) to confirm no errors and that the preview renders.
5. Run the database linter and report anything it flags on the new tables.

## Technical notes

- Grants pattern per new table: read/write for authenticated, full for service role, no anonymous access (all policies are membership scoped).
- The finance report and order-to-invoice functions are `SECURITY INVOKER` and do their own role checks, so they rely on those grants being present.
- No policy or business rule from your new migrations will be changed — only the missing grants are added.
