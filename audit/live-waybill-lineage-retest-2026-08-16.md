# Live Waybill Lineage and Registry Retest — 2026-08-16

## Environment

The retest used the authenticated maintenance-admin session on `https://nifhdpe.vercel.app` at the desktop viewport. The code fix commit is `fdd43c4` on `main`; GitHub CI run `31963795701` completed successfully.

## Observed live state after deployment

The Logistics delivery card now displays `SALES_ORDERS/2026/0001C` instead of `Unlinked delivery`, shows `₦17,250.00`, and exposes `View dispatched items (1)` with `UAT-PE100-110-SDR11 · UAT HDPE Pipe 110mm SDR11` and quantity `1`. The underlying live read-only query confirmed the delivery has `sales_order_id = 4d0c2b30-47c9-4897-8e99-560f16948dfc` and one delivery item linked to `UAT-PE100-110-SDR11`.

Selecting `Print Waybill` on the live delivery produced the toast `Waybill generated and recorded — WAYBILLS/2026/0002 is now available in Document Registry for reprint.` The downloaded PDF was one A4 page, but it still contained the old `Materials in transit` fallback row and `Print history: copy 2`. This is expected until the new database migration is applied because the existing idempotent waybill row is returned by the old `issue_waybill` RPC without refreshing its JSONB snapshot.

The forward migration `supabase/migrations/20260816120000_fix_waybill_delivery_item_lineage.sql` now makes `delivery_items` authoritative, repairs generic existing snapshots, and preserves idempotent reprints. It must be applied to the live database before the final lineage retest can be marked PASS.

## Document Registry retest

Document Registry loaded 24 numbered documents and showed two waybill rows. `WAYBILLS/2026/0002` appeared as a Waybill with status `Reprinted` and a `Reprint` action. Selecting `Reprint` produced the toast `Waybill reprinted — WAYBILLS/2026/0002 copy 3 was generated and recorded.` The UI remained responsive and the row transitioned to `Printing…` during the operation. This confirms registry recording and reprint reaction; PDF content remains migration-dependent for the old snapshot.

## Current gate status

Confirmed-order delivery lineage: **IN PROGRESS**, because the UI lineage and registry lifecycle pass but the authoritative waybill PDF item snapshot cannot be certified until the migration is applied and the PDF is retested. Document Registry recording/reprint: **PASS for workflow reaction**, with content certification pending the same migration-dependent PDF retest.
