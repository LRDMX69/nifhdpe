-- 1. Equipment Maintenance Logs
CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL, -- 'routine', 'repair', 'calibration'
  performed_date DATE DEFAULT CURRENT_DATE,
  technician_name TEXT,
  description TEXT,
  cost DECIMAL(15, 2) DEFAULT 0,
  next_service_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view maintenance logs" ON public.equipment_maintenance FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.equipment_maintenance.organization_id));

-- 2. Maintenance Alerts Function
CREATE OR REPLACE FUNCTION public.get_maintenance_alerts(_org_id UUID)
RETURNS TABLE (
  equipment_id UUID,
  equipment_name TEXT,
  alert_type TEXT,
  due_date DATE,
  days_overdue INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as equipment_id,
    e.name as equipment_name,
    CASE 
      WHEN e.type = 'Fusion Machine' THEN 'Calibration'
      ELSE 'Routine Maintenance'
    END as alert_type,
    e.next_maintenance_date as due_date,
    (CURRENT_DATE - e.next_maintenance_date)::INTEGER as days_overdue
  FROM public.equipment e
  WHERE e.organization_id = _org_id
  AND e.next_maintenance_date <= (CURRENT_DATE + INTERVAL '7 days')
  AND e.status != 'retired';
END;
$$;
