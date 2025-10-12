-- Fix ambiguous column reference by using proper aliases

-- Drop and recreate notify_followers_new_post with fix
DROP FUNCTION IF EXISTS public.notify_followers_new_post() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_followers_new_post()
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
    PERFORM public.create_notification(
      follower_user_id,
      'new_post',
      poster_username || ' shared a new post'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_followers_new_reel with fix
DROP FUNCTION IF EXISTS public.notify_followers_new_reel() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_followers_new_reel()
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
    PERFORM public.create_notification(
      follower_user_id,
      'new_reel',
      poster_username || ' shared a new reel'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_followers_new_music with fix
DROP FUNCTION IF EXISTS public.notify_followers_new_music() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_followers_new_music()
RETURNS trigger
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
      'new_music',
      sharer_username || ' shared ' || NEW.track_title
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_followers_new_story with fix
DROP FUNCTION IF EXISTS public.notify_followers_new_story() CASCADE;
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
    PERFORM public.create_notification(
      follower_user_id,
      'new_story',
      poster_username || ' shared a new story'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Recreate the triggers (CASCADE dropped them)
CREATE TRIGGER trigger_notify_followers_new_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_post();

CREATE TRIGGER trigger_notify_followers_new_reel
  AFTER INSERT ON public.reels
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_reel();

CREATE TRIGGER trigger_notify_followers_new_music
  AFTER INSERT ON public.music_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_music();

CREATE TRIGGER trigger_notify_followers_new_story
  AFTER INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_story();