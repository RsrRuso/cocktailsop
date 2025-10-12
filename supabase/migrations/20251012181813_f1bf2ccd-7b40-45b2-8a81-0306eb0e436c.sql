-- Fix update_expired_events function to set search_path
CREATE OR REPLACE FUNCTION public.update_expired_events()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.events
  SET status = 'completed'
  WHERE status = 'upcoming'
    AND event_date IS NOT NULL
    AND event_date < NOW();
END;
$function$;

-- Fix check_event_status function to set search_path
CREATE OR REPLACE FUNCTION public.check_event_status()
 RETURNS trigger
 LANGUAGE plpgsql
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