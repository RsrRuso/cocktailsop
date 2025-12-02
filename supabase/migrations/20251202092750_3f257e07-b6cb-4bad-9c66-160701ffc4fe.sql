-- Add unique constraint to prevent duplicate like notifications
CREATE UNIQUE INDEX idx_unique_story_like_notification 
ON notifications (user_id, type, story_id, reference_user_id) 
WHERE type = 'like' AND story_id IS NOT NULL;

-- Update notify_story_like function with deduplication
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
  
  -- Don't notify if user is liking their own story
  IF story_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  -- Insert with ON CONFLICT DO NOTHING to prevent duplicates
  INSERT INTO notifications (user_id, type, content, story_id, reference_user_id)
  VALUES (story_owner_id, 'like', liker_username || ' liked your story', NEW.story_id, NEW.user_id)
  ON CONFLICT (user_id, type, story_id, reference_user_id) 
  WHERE type = 'like' AND story_id IS NOT NULL 
  DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Update notify_story_comment function 
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
  
  -- Don't notify if user is commenting on their own story
  IF story_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  -- Insert notification (comments can have multiple notifications)
  INSERT INTO notifications (user_id, type, content, story_id, reference_user_id)
  VALUES (story_owner_id, 'comment', commenter_username || ' commented on your story', NEW.story_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;