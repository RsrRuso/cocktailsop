-- Fix search_path for notify_reel_like
CREATE OR REPLACE FUNCTION public.notify_reel_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reel_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  IF reel_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content, reel_id)
    VALUES (reel_owner_id, 'like', liker_username || ' liked your reel', NEW.reel_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for notify_reel_comment
CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reel_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  IF reel_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content, reel_id)
    VALUES (reel_owner_id, 'comment', commenter_username || ' commented on your reel', NEW.reel_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for notify_story_like
CREATE OR REPLACE FUNCTION public.notify_story_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  story_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM stories WHERE id = NEW.story_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  IF story_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content, story_id, reference_user_id)
    VALUES (story_owner_id, 'like', liker_username || ' liked your story', NEW.story_id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for notify_story_comment
CREATE OR REPLACE FUNCTION public.notify_story_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  story_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM stories WHERE id = NEW.story_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  IF story_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content, story_id, reference_user_id)
    VALUES (story_owner_id, 'comment', commenter_username || ' commented on your story', NEW.story_id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for notify_profile_view
CREATE OR REPLACE FUNCTION public.notify_profile_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  viewer_username TEXT;
BEGIN
  IF NEW.viewer_id != NEW.viewed_profile_id THEN
    SELECT username INTO viewer_username FROM profiles WHERE id = NEW.viewer_id;
    
    INSERT INTO notifications (user_id, type, content, reference_user_id)
    VALUES (
      NEW.viewed_profile_id,
      'profile_view',
      viewer_username || ' viewed your profile',
      NEW.viewer_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;