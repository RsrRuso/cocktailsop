-- Fix the notify_followers_new_story function to not use non-existent constraint
CREATE OR REPLACE FUNCTION public.notify_followers_new_story()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  poster_username TEXT;
  follower_user_id UUID;
BEGIN
  SELECT username INTO poster_username FROM public.profiles WHERE id = NEW.user_id;
  
  FOR follower_user_id IN 
    SELECT f.follower_id FROM public.follows f WHERE f.following_id = NEW.user_id
  LOOP
    -- Simple insert without constraint reference
    INSERT INTO public.notifications (user_id, type, content, read, created_at)
    VALUES (
      follower_user_id,
      'new_story',
      COALESCE(poster_username, 'Someone') || ' shared a new story',
      false,
      NOW()
    );
  END LOOP;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Silently ignore duplicate notifications
    RETURN NEW;
END;
$function$;