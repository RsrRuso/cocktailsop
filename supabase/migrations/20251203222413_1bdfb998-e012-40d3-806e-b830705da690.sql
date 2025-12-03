-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS trigger_notify_followers_new_story ON public.stories;

-- Update the notification function to handle duplicates gracefully
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
    -- Use INSERT with ON CONFLICT to avoid duplicate errors
    INSERT INTO public.notifications (user_id, type, content, read, created_at)
    VALUES (
      follower_user_id,
      'new_story',
      COALESCE(poster_username, 'Someone') || ' shared a new story',
      false,
      NOW()
    )
    ON CONFLICT ON CONSTRAINT notifications_dedup_idx DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;