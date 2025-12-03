
-- Create a unique index to prevent future duplicates on likes
CREATE UNIQUE INDEX notifications_unique_like_idx 
ON notifications (user_id, type, COALESCE(post_id::text, ''), COALESCE(reel_id::text, ''), COALESCE(story_id::text, ''), COALESCE(music_share_id::text, ''), COALESCE(event_id::text, ''), COALESCE(reference_user_id::text, ''))
WHERE type = 'like';

-- Update notify_reel_like to check for existing before insert
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
  
  IF reel_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = reel_owner_id 
    AND type = 'like' 
    AND reel_id = NEW.reel_id 
    AND reference_user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, reel_id, reference_user_id)
  VALUES (reel_owner_id, 'like', liker_username || ' liked your reel', NEW.reel_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;

-- Update notify_post_like
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
  
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = post_owner_id 
    AND type = 'like' 
    AND post_id = NEW.post_id 
    AND reference_user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, post_id, reference_user_id)
  VALUES (post_owner_id, 'like', liker_username || ' liked your post', NEW.post_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;

-- Update notify_story_like
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
  
  IF story_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = story_owner_id 
    AND type = 'like' 
    AND story_id = NEW.story_id 
    AND reference_user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, story_id, reference_user_id)
  VALUES (story_owner_id, 'like', liker_username || ' liked your story', NEW.story_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;

-- Update notify_music_share_like
CREATE OR REPLACE FUNCTION public.notify_music_share_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  music_share_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO music_share_owner_id FROM music_shares WHERE id = NEW.music_share_id;
  
  IF music_share_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = music_share_owner_id 
    AND type = 'like' 
    AND music_share_id = NEW.music_share_id 
    AND reference_user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, music_share_id, reference_user_id)
  VALUES (music_share_owner_id, 'like', liker_username || ' liked your music share', NEW.music_share_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;

-- Update notify_event_like
CREATE OR REPLACE FUNCTION public.notify_event_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO event_owner_id FROM events WHERE id = NEW.event_id;
  
  IF event_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = event_owner_id 
    AND type = 'like' 
    AND event_id = NEW.event_id 
    AND reference_user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, event_id, reference_user_id)
  VALUES (event_owner_id, 'like', liker_username || ' liked your event', NEW.event_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;
