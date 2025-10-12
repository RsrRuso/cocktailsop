-- Drop the old 3-parameter create_notification function to avoid ambiguity
DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text);

-- Keep only the extended version with all parameters
-- (The function with all parameters already exists, so no need to recreate it)

-- Update the notify_followers_new_music trigger to use explicit parameter names
CREATE OR REPLACE FUNCTION public.notify_followers_new_music()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  sharer_username TEXT;
  follower_user_id UUID;
BEGIN
  SELECT username INTO sharer_username FROM public.profiles WHERE id = NEW.user_id;
  
  FOR follower_user_id IN 
    SELECT f.follower_id FROM public.follows f WHERE f.following_id = NEW.user_id
  LOOP
    PERFORM public.create_notification(
      follower_user_id,
      'new_music'::text,
      sharer_username || ' shared ' || NEW.track_title,
      NULL,  -- post_id
      NULL,  -- reel_id
      NULL,  -- story_id
      NEW.id,  -- music_share_id
      NULL,  -- event_id
      NULL   -- reference_user_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;