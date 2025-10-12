-- Remove self-notification prevention from post likes
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  PERFORM create_notification(
    post_owner_id,
    'like',
    liker_username || ' liked your post',
    NEW.post_id,
    NULL, NULL, NULL, NULL, NULL
  );
  
  RETURN NEW;
END;
$function$;

-- Remove self-notification prevention from post comments
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  PERFORM create_notification(
    post_owner_id,
    'comment',
    commenter_username || ' commented on your post',
    NEW.post_id,
    NULL, NULL, NULL, NULL, NULL
  );
  
  RETURN NEW;
END;
$function$;

-- Remove self-notification prevention from reel likes
CREATE OR REPLACE FUNCTION public.notify_reel_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reel_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, reel_id)
  VALUES (reel_owner_id, 'like', liker_username || ' liked your reel', NEW.reel_id);
  
  RETURN NEW;
END;
$function$;

-- Remove self-notification prevention from reel comments
CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reel_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, reel_id)
  VALUES (reel_owner_id, 'comment', commenter_username || ' commented on your reel', NEW.reel_id);
  
  RETURN NEW;
END;
$function$;

-- Remove self-notification prevention from story likes
CREATE OR REPLACE FUNCTION public.notify_story_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  story_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM stories WHERE id = NEW.story_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, story_id, reference_user_id)
  VALUES (story_owner_id, 'like', liker_username || ' liked your story', NEW.story_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;

-- Remove self-notification prevention from story comments
CREATE OR REPLACE FUNCTION public.notify_story_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  story_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM stories WHERE id = NEW.story_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, story_id, reference_user_id)
  VALUES (story_owner_id, 'comment', commenter_username || ' commented on your story', NEW.story_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;