-- Add reference fields to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS post_id UUID,
ADD COLUMN IF NOT EXISTS reel_id UUID,
ADD COLUMN IF NOT EXISTS story_id UUID,
ADD COLUMN IF NOT EXISTS music_share_id UUID,
ADD COLUMN IF NOT EXISTS event_id UUID,
ADD COLUMN IF NOT EXISTS reference_user_id UUID;

-- Update the create_notification function to accept optional reference IDs
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_content TEXT,
  p_post_id UUID DEFAULT NULL,
  p_reel_id UUID DEFAULT NULL,
  p_story_id UUID DEFAULT NULL,
  p_music_share_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_reference_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, content,
    post_id, reel_id, story_id, music_share_id, event_id, reference_user_id
  )
  VALUES (
    p_user_id, p_type, p_content,
    p_post_id, p_reel_id, p_story_id, p_music_share_id, p_event_id, p_reference_user_id
  );
END;
$$;

-- Update notify_post_like to include post_id
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      post_owner_id,
      'like',
      liker_username || ' liked your post',
      NEW.post_id,  -- post_id
      NULL, NULL, NULL, NULL, NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_post_comment to include post_id
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      post_owner_id,
      'comment',
      commenter_username || ' commented on your post',
      NEW.post_id,  -- post_id
      NULL, NULL, NULL, NULL, NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_reel_like to include reel_id
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

-- Update notify_reel_comment to include reel_id
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

-- Update notify_story_like to include story_id
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

-- Update notify_story_comment to include story_id
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

-- Update notify_new_follower to include reference_user_id
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower_username TEXT;
BEGIN
  SELECT username INTO follower_username FROM profiles WHERE id = NEW.follower_id;
  
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    follower_username || ' started following you',
    NULL, NULL, NULL, NULL, NULL,
    NEW.follower_id  -- reference_user_id
  );
  
  RETURN NEW;
END;
$$;

-- Update notify_profile_view to include reference_user_id
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