
-- 1. Termination columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terminated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terminated_at timestamptz,
  ADD COLUMN IF NOT EXISTS terminated_by uuid;

-- 2. Helper to check termination
CREATE OR REPLACE FUNCTION public.is_user_terminated(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT terminated FROM public.profiles WHERE user_id = _uid LIMIT 1), false);
$$;

-- 3. Prevent terminated users from being added back to memberships
CREATE OR REPLACE FUNCTION public.block_terminated_membership()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.is_user_terminated(NEW.user_id) THEN
    RAISE EXCEPTION 'User is terminated and cannot be assigned roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_terminated_membership ON public.organization_memberships;
CREATE TRIGGER trg_block_terminated_membership
  BEFORE INSERT OR UPDATE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.block_terminated_membership();

-- 4. Create claims-proof public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('claims-proof', 'claims-proof', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read (bucket is public anyway)
DROP POLICY IF EXISTS "claims_proof_public_read" ON storage.objects;
CREATE POLICY "claims_proof_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'claims-proof');

DROP POLICY IF EXISTS "claims_proof_authenticated_upload" ON storage.objects;
CREATE POLICY "claims_proof_authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'claims-proof');

DROP POLICY IF EXISTS "claims_proof_owner_delete" ON storage.objects;
CREATE POLICY "claims_proof_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'claims-proof' AND (owner = auth.uid() OR public.is_maintenance_admin(auth.uid())));
