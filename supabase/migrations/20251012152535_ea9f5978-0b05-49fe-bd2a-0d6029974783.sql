-- Create function to notify founders of new user registrations
CREATE OR REPLACE FUNCTION public.notify_founders_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  founder_id UUID;
  new_username TEXT;
BEGIN
  -- Get the new user's username
  new_username := NEW.username;
  
  -- Notify all founders
  FOR founder_id IN 
    SELECT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role = 'founder'::public.app_role
  LOOP
    PERFORM public.create_notification(
      founder_id,
      'new_user',
      '🎉 New user registered: ' || new_username
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to fire when new users are created
CREATE TRIGGER trigger_notify_founders_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_founders_new_user();