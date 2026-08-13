-- Connect existing BOQ records to the controlled product and commercial lineage.
-- The guarded block keeps this migration safe for installations where BOQ tables are
-- provisioned separately from the core ERP migrations.

DO $$
BEGIN
  IF to_regclass('public.boqs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.boqs ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS boqs_sales_order_idx ON public.boqs(organization_id, sales_order_id)';
  END IF;

  IF to_regclass('public.boq_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.boq_items ADD COLUMN IF NOT EXISTS product_specification_id uuid REFERENCES public.product_specifications(id) ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS boq_items_product_specification_idx ON public.boq_items(product_specification_id)';
  END IF;
END $$;
