-- Fix security warning: Function search path mutable
CREATE OR REPLACE FUNCTION public.update_venue_outlets_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;