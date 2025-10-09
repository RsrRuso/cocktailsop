-- Fix search_path for create_notification function
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_content TEXT
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, p_type, p_content);
END;
$$;

-- Fix search_path for notify_post_like function
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
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
      liker_username || ' liked your post'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for notify_post_comment function
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
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
      commenter_username || ' commented on your post'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for notify_new_follower function
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_username TEXT;
BEGIN
  SELECT username INTO follower_username FROM profiles WHERE id = NEW.follower_id;
  
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    follower_username || ' started following you'
  );
  
  RETURN NEW;
END;
$$;