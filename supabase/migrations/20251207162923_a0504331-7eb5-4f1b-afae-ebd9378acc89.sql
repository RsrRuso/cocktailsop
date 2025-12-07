-- Create function to notify followers when user earns a certificate
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_username TEXT;
  badge_name TEXT;
  category_name TEXT;
  follower_user_id UUID;
BEGIN
  -- Get user info
  SELECT COALESCE(full_name, username, 'Someone') INTO user_username 
  FROM profiles WHERE id = NEW.user_id;
  
  -- Get badge level name
  SELECT name INTO badge_name 
  FROM exam_badge_levels WHERE id = NEW.badge_level_id;
  
  -- Get category name
  SELECT name INTO category_name 
  FROM exam_categories WHERE id = NEW.category_id;
  
  -- Notify all followers
  INSERT INTO notifications (user_id, type, content, reference_user_id)
  SELECT 
    f.follower_id,
    'certificate_earned',
    user_username || ' earned a ' || COALESCE(badge_name, 'new') || ' certificate in ' || COALESCE(category_name, 'an exam') || '! 🏆',
    NEW.user_id
  FROM follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for certificate notifications
DROP TRIGGER IF EXISTS notify_followers_on_certificate ON exam_certificates;
CREATE TRIGGER notify_followers_on_certificate
  AFTER INSERT ON exam_certificates
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_on_new_certificate();