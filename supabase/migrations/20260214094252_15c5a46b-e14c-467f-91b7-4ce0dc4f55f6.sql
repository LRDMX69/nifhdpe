-- Update handle_new_user to auto-assign organization_id to the default org
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
BEGIN
  -- Get the first/default organization
  SELECT id INTO _org_id FROM public.organizations LIMIT 1;

  INSERT INTO public.profiles (user_id, full_name, organization_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), _org_id);
  
  RETURN NEW;
END;
$function$;
