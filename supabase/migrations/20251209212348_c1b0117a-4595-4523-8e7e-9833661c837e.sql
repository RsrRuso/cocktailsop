-- Update notify_post_comment to include reference_user_id for the commenter
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- Don't notify if commenting on own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  PERFORM create_notification(
    post_owner_id,
    'comment',
    commenter_username || ' commented on your post',
    NEW.post_id,
    NULL, NULL, NULL, NULL, NEW.user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update notify_reel_comment to include reference_user_id and skip self-comments
CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS TRIGGER AS $$
DECLARE
  reel_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;
  
  -- Don't notify if commenting on own reel
  IF reel_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, reel_id, reference_user_id)
  VALUES (reel_owner_id, 'comment', commenter_username || ' commented on your reel', NEW.reel_id, NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;