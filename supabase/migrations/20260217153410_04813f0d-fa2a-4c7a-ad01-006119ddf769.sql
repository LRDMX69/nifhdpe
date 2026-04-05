
-- 1. DELIVERIES TABLE
CREATE TYPE public.delivery_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');

CREATE TABLE public.deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  destination text NOT NULL,
  vehicle text,
  driver text,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  cost numeric DEFAULT 0,
  distance_km numeric DEFAULT 0,
  notes text,
  status delivery_status NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view deliveries" ON public.deliveries FOR SELECT
  USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Warehouse/Admin can insert deliveries" ON public.deliveries FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR has_org_role(auth.uid(), organization_id, 'technician') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Warehouse/Admin can update deliveries" ON public.deliveries FOR UPDATE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR has_org_role(auth.uid(), organization_id, 'warehouse') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "Admin can delete deliveries" ON public.deliveries FOR DELETE
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));

-- 2. MESSAGE RISK LOGS TABLE
CREATE TABLE public.message_risk_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  message_id uuid NOT NULL REFERENCES public.messages(id),
  risk_score numeric NOT NULL DEFAULT 0,
  risk_category text NOT NULL DEFAULT 'unknown',
  details text,
  flagged_content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_risk_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view message risk logs" ON public.message_risk_logs FOR SELECT
  USING (has_org_role(auth.uid(), organization_id, 'administrator') OR is_maintenance_admin(auth.uid()));
CREATE POLICY "System can insert message risk logs" ON public.message_risk_logs FOR INSERT
  WITH CHECK (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

-- 3. GPS COLUMNS
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS office_lat numeric;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS office_lng numeric;

-- 4. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_risk_logs;
