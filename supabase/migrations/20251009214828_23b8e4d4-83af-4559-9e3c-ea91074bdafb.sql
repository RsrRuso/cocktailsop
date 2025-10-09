-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_content TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, p_type, p_content);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post likes
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
  liker_username TEXT;
BEGIN
  -- Get post owner and liker username
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if user likes their own post
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      post_owner_id,
      'like',
      liker_username || ' liked your post'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER post_like_notification
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();

-- Trigger for post comments
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
  commenter_username TEXT;
BEGIN
  -- Get post owner and commenter username
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if user comments on their own post
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      post_owner_id,
      'comment',
      commenter_username || ' commented on your post'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER post_comment_notification
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();

-- Trigger for new followers
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER new_follower_notification
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION notify_new_follower();