# Apply the six new database migrations (Aug 14)

## What I found

Six migration files in your local changes have not been applied to the database yet. I confirmed this directly: none of the new functions or columns exist in the live database.

Missing right now:
- `create_purchase_order_with_items` and `create_material_requisition_with_items` (Procurement)
- `delete_inventory_item_safely` (Inventory)
- `record_invoice_payment` with a payment-date argument (Finance) — only the older 6-argument version exists
- `create_worker_payment_from_claim` plus the `worker_payments.claim_id` / `worker_claims.payment_id` link columns
- `vehicles.name` and `deliveries.manual_dispatch_reason` (Logistics)
- The updated `resolve_service_ticket` that writes structured parts rows

Pages that already call into this layer (Procurement, Inventory, Finance, Worker Claims, Logistics, Record Payment dialog) will keep failing until the migrations run.

## What I will do

1. Apply the six migrations in date order, exactly as written in your files:
   - procurement line-item connectors
   - service ticket parts on resolution
   - safe inventory deletion guard
   - invoice payment date connector
   - worker claim to payment connector
   - fleet name and manual dispatch reason columns
2. Regenerate the database type definitions so the new functions and columns are typed in the app.
3. Run the database linter and report anything it flags.
4. Load the affected pages (Procurement, Inventory, Finance, Worker Claims, Logistics) in a browser to confirm no runtime errors.

## Technical notes

- All new functions are `SECURITY INVOKER` with in-function role checks and carry their own `GRANT EXECUTE ... TO authenticated`, so no extra grants are needed.
- The new `record_invoice_payment` is an overload; the existing 6-argument version stays in place, so nothing that calls the old signature breaks.
- Only additive `ADD COLUMN IF NOT EXISTS` changes on `worker_payments`, `worker_claims`, `vehicles` and `deliveries` — no data is modified and existing RLS policies continue to govern the new columns.
