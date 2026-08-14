-- Native fleet workflow completion: retain an operational vehicle name alongside the legally identifying plate number.
-- Existing RLS policies on public.vehicles continue to govern this column.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS name text;

COMMENT ON COLUMN public.vehicles.name IS
  'Operational fleet name, such as a vehicle call sign or asset name; plate_number remains the legal registration identifier.';

-- Manual deliveries are allowed for genuine exceptions, but the operational reason
-- must be retained instead of silently bypassing the sales-order delivery path.
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS manual_dispatch_reason text;

COMMENT ON COLUMN public.deliveries.manual_dispatch_reason IS
  'Required by the application for manually scheduled delivery exceptions that were not created from a confirmed sales order.';
