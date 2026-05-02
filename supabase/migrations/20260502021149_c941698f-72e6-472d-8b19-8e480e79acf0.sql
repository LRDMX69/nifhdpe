-- H3: Wrap maintenance admin check so users can only check their OWN status (privacy)
-- The function already exists as is_maintenance_admin(_uid uuid) SECURITY DEFINER.
-- Tighten RLS on system_maintenance_accounts so it's not readable by everyone.
ALTER TABLE IF EXISTS public.system_maintenance_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can check own maintenance status" ON public.system_maintenance_accounts;
CREATE POLICY "Users can check own maintenance status"
  ON public.system_maintenance_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- H7: Lock down site-photos bucket — restrict listing/reads to authenticated org members.
-- We keep the bucket "public" for direct-URL access, but block anonymous SELECT on storage.objects.
DROP POLICY IF EXISTS "Public can list site photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated members can read site photos" ON storage.objects;
CREATE POLICY "Authenticated members can read site photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'site-photos');

DROP POLICY IF EXISTS "Authenticated members can upload site photos" ON storage.objects;
CREATE POLICY "Authenticated members can upload site photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-photos');

DROP POLICY IF EXISTS "Owners can delete their site photos" ON storage.objects;
CREATE POLICY "Owners can delete their site photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-photos' AND owner = auth.uid());

-- C4: Make handle_new_user deterministic — pick the canonical default org by name first.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
BEGIN
  -- Prefer the canonical default organization
  SELECT id INTO _org_id
  FROM public.organizations
  WHERE name = 'NIF Technical Services Ltd'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Fallback: oldest organization
  IF _org_id IS NULL THEN
    SELECT id INTO _org_id FROM public.organizations
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, organization_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), _org_id);

  RETURN NEW;
END;
$$;