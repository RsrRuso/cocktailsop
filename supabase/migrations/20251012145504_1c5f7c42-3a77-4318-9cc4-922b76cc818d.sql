-- Create trigger function for unfollow notifications
CREATE OR REPLACE FUNCTION public.notify_unfollow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  unfollower_username TEXT;
BEGIN
  SELECT username INTO unfollower_username FROM public.profiles WHERE id = OLD.follower_id;
  
  PERFORM public.create_notification(
    OLD.following_id,
    'unfollow',
    unfollower_username || ' unfollowed you'
  );
  
  RETURN OLD;
END;
$function$;

-- Create trigger for unfollows
CREATE TRIGGER on_unfollow
AFTER DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION notify_unfollow();

-- Create trigger function for new post notifications to followers
CREATE OR REPLACE FUNCTION public.notify_followers_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  poster_username TEXT;
  follower_id UUID;
BEGIN
  SELECT username INTO poster_username FROM public.profiles WHERE id = NEW.user_id;
  
  FOR follower_id IN 
    SELECT follower_id FROM public.follows WHERE following_id = NEW.user_id
  LOOP
    PERFORM public.create_notification(
      follower_id,
      'new_post',
      poster_username || ' shared a new post'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new posts
CREATE TRIGGER on_new_post
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION notify_followers_new_post();

-- Create trigger function for new reel notifications to followers
CREATE OR REPLACE FUNCTION public.notify_followers_new_reel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  poster_username TEXT;
  follower_id UUID;
BEGIN
  SELECT username INTO poster_username FROM public.profiles WHERE id = NEW.user_id;
  
  FOR follower_id IN 
    SELECT follower_id FROM public.follows WHERE following_id = NEW.user_id
  LOOP
    PERFORM public.create_notification(
      follower_id,
      'new_reel',
      poster_username || ' shared a new reel'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new reels
CREATE TRIGGER on_new_reel
AFTER INSERT ON reels
FOR EACH ROW EXECUTE FUNCTION notify_followers_new_reel();

-- Create trigger function for new music share notifications to followers
CREATE OR REPLACE FUNCTION public.notify_followers_new_music()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  sharer_username TEXT;
  follower_id UUID;
BEGIN
  SELECT username INTO sharer_username FROM public.profiles WHERE id = NEW.user_id;
  
  FOR follower_id IN 
    SELECT follower_id FROM public.follows WHERE following_id = NEW.user_id
  LOOP
    PERFORM public.create_notification(
      follower_id,
      'new_music',
      sharer_username || ' shared ' || NEW.track_title
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new music shares
CREATE TRIGGER on_new_music_share
AFTER INSERT ON music_shares
FOR EACH ROW EXECUTE FUNCTION notify_followers_new_music();

-- Create trigger function for new story notifications to followers
CREATE OR REPLACE FUNCTION public.notify_followers_new_story()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  poster_username TEXT;
  follower_id UUID;
BEGIN
  SELECT username INTO poster_username FROM public.profiles WHERE id = NEW.user_id;
  
  FOR follower_id IN 
    SELECT follower_id FROM public.follows WHERE following_id = NEW.user_id
  LOOP
    PERFORM public.create_notification(
      follower_id,
      'new_story',
      poster_username || ' shared a new story'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new stories
CREATE TRIGGER on_new_story
AFTER INSERT ON stories
FOR EACH ROW EXECUTE FUNCTION notify_followers_new_story();