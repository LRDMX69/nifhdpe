-- 1. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  quotation_id UUID REFERENCES public.quotations(id),
  document_number TEXT UNIQUE, -- e.g., INV/2026/0001
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  balance_due DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid', 'void', 'overdue'
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.invoices.organization_id));

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Receipts (Payments received from clients)
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  invoice_id UUID REFERENCES public.invoices(id),
  document_number TEXT UNIQUE, -- e.g., RCPT/2026/0001
  payment_date DATE DEFAULT CURRENT_DATE,
  amount_received DECIMAL(15, 2) NOT NULL,
  payment_method TEXT, -- 'cash', 'transfer', 'cheque'
  reference_number TEXT,
  notes TEXT,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view receipts" ON public.receipts FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.receipts.organization_id));

-- Triggers for document numbering
CREATE TRIGGER tr_invoices_doc_num BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
CREATE TRIGGER tr_receipts_doc_num BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();

-- Update function for invoice balance and status
CREATE OR REPLACE FUNCTION public.handle_receipt_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET balance_due = balance_due - NEW.amount_received,
        status = CASE 
          WHEN (balance_due - NEW.amount_received) <= 0 THEN 'paid'
          ELSE 'partially_paid'
        END
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_receipts_after_insert AFTER INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.handle_receipt_insert();
