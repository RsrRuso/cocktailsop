-- Update notify_post_like to send notifications for own content
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  post_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  SELECT username INTO liker_username FROM public.profiles WHERE id = NEW.user_id;
  
  PERFORM public.create_notification(
    post_owner_id,
    'like',
    liker_username || ' liked your post'
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_post_comment to send notifications for own content
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  post_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  
  PERFORM public.create_notification(
    post_owner_id,
    'comment',
    commenter_username || ' commented on your post'
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_story_like to send notifications for own content
CREATE OR REPLACE FUNCTION public.notify_story_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  story_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM public.stories WHERE id = NEW.story_id;
  SELECT username INTO liker_username FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (
    story_owner_id,
    'like',
    liker_username || ' liked your story'
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_story_comment to send notifications for own content
CREATE OR REPLACE FUNCTION public.notify_story_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  story_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM public.stories WHERE id = NEW.story_id;
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (
    story_owner_id,
    'comment',
    commenter_username || ' commented on your story'
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_reel_like to send notifications for own content
CREATE OR REPLACE FUNCTION public.notify_reel_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  reel_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  SELECT username INTO liker_username FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (
    reel_owner_id,
    'like',
    liker_username || ' liked your reel'
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_reel_comment to send notifications for own content
CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  reel_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (
    reel_owner_id,
    'comment',
    commenter_username || ' commented on your reel'
  );
  
  RETURN NEW;
END;
$function$;