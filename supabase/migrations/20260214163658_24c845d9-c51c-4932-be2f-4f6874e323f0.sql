
-- Worker Claims table for expense/issue reporting
CREATE TABLE public.worker_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  claim_type TEXT NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  project_id UUID REFERENCES public.projects(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_claims ENABLE ROW LEVEL SECURITY;

-- Workers can submit their own claims
CREATE POLICY "Users can insert own claims"
ON public.worker_claims FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_maintenance_admin(auth.uid()));

-- Workers can view their own claims, admin/finance see all
CREATE POLICY "Users view own or admin views all"
ON public.worker_claims FOR SELECT
USING (
  auth.uid() = user_id
  OR has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
  OR is_maintenance_admin(auth.uid())
);

-- Admin/Finance can update claims
CREATE POLICY "Admin can update claims"
ON public.worker_claims FOR UPDATE
USING (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'finance'::app_role)
  OR is_maintenance_admin(auth.uid())
);

-- Admin can delete claims
CREATE POLICY "Admin can delete claims"
ON public.worker_claims FOR DELETE
USING (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR is_maintenance_admin(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_worker_claims_updated_at
BEFORE UPDATE ON public.worker_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Equipment requests table
CREATE TABLE public.equipment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  requested_by UUID NOT NULL,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  project_id UUID REFERENCES public.projects(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert equipment requests"
ON public.equipment_requests FOR INSERT
WITH CHECK (auth.uid() = requested_by OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Members can view equipment requests"
ON public.equipment_requests FOR SELECT
USING (is_member_of_org(auth.uid(), organization_id) OR is_maintenance_admin(auth.uid()));

CREATE POLICY "Admin can update equipment requests"
ON public.equipment_requests FOR UPDATE
USING (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR is_maintenance_admin(auth.uid())
);

CREATE POLICY "Admin can delete equipment requests"
ON public.equipment_requests FOR DELETE
USING (
  has_org_role(auth.uid(), organization_id, 'administrator'::app_role)
  OR is_maintenance_admin(auth.uid())
);

CREATE TRIGGER update_equipment_requests_updated_at
BEFORE UPDATE ON public.equipment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
