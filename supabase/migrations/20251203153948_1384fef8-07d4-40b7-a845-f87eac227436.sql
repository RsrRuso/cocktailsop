-- Fix functions with mutable search path

-- Fix sync_user_email function
CREATE OR REPLACE FUNCTION public.sync_user_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update profile email when user email changes
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

-- Fix check_event_status function
CREATE OR REPLACE FUNCTION public.check_event_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_date IS NOT NULL AND NEW.event_date < NOW() THEN
    NEW.status := 'completed';
  ELSE
    NEW.status := 'upcoming';
  END IF;
  RETURN NEW;
END;
$function$;