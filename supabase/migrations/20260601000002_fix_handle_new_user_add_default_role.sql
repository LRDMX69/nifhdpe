
-- Update handle_new_user function to also create default organization_membership for new users
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

  -- Insert default membership (technician role) for new user
  IF _org_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships (user_id, organization_id, role)
    VALUES (NEW.id, _org_id, 'technician');
  END IF;

  RETURN NEW;
END;
$$;
