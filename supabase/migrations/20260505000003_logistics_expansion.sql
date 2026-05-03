-- 1. Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL UNIQUE,
  model TEXT,
  make TEXT,
  year INTEGER,
  current_km DECIMAL(12, 2) DEFAULT 0,
  assigned_driver_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active', -- 'active', 'maintenance', 'retired'
  insurance_expiry DATE,
  last_maintenance_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.vehicles.organization_id));

-- 2. Fuel Logs
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  date DATE DEFAULT CURRENT_DATE,
  liters DECIMAL(10, 2) NOT NULL,
  cost_per_liter DECIMAL(10, 2),
  total_cost DECIMAL(15, 2) NOT NULL,
  km_reading DECIMAL(12, 2),
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fuel logs" ON public.fuel_logs FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.fuel_logs.organization_id));

-- Trigger to update vehicle km
CREATE OR REPLACE FUNCTION public.handle_fuel_log_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.km_reading IS NOT NULL THEN
    UPDATE public.vehicles
    SET current_km = GREATEST(current_km, NEW.km_reading)
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_fuel_logs_after_insert AFTER INSERT ON public.fuel_logs FOR EACH ROW EXECUTE FUNCTION public.handle_fuel_log_insert();
