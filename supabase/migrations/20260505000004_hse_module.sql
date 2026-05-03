-- 1. HSE Incidents
CREATE TABLE IF NOT EXISTS public.hse_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  document_number TEXT UNIQUE, -- e.g., HSE/2026/0001
  incident_date DATE DEFAULT CURRENT_DATE,
  incident_time TIME,
  location TEXT,
  severity TEXT, -- 'low', 'medium', 'high', 'critical'
  type TEXT, -- 'near_miss', 'injury', 'property_damage', 'environmental'
  description TEXT NOT NULL,
  immediate_action TEXT,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'closed'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hse_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view HSE incidents" ON public.hse_incidents FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.hse_incidents.organization_id));

-- 2. Toolbox Talks
CREATE TABLE IF NOT EXISTS public.toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  document_number TEXT UNIQUE, -- e.g., TBT/2026/0001
  date DATE DEFAULT CURRENT_DATE,
  topic TEXT NOT NULL,
  conducted_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  attendee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.toolbox_talks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view TBTs" ON public.toolbox_talks FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM organization_memberships WHERE organization_id = public.toolbox_talks.organization_id));

-- Triggers for document numbering
CREATE TRIGGER tr_hse_incidents_doc_num BEFORE INSERT ON public.hse_incidents FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
CREATE TRIGGER tr_toolbox_talks_doc_num BEFORE INSERT ON public.toolbox_talks FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
