-- Drop existing trigger and function
DROP TRIGGER IF EXISTS notify_followers_on_certificate ON public.exam_certificates;
DROP FUNCTION IF EXISTS public.notify_followers_on_new_certificate();

-- Create updated function to notify both followers AND following
CREATE OR REPLACE FUNCTION public.notify_followers_and_following_on_certificate()
RETURNS TRIGGER AS $$
DECLARE
  achiever_profile RECORD;
  badge_name TEXT;
  category_name TEXT;
  follower_id UUID;
BEGIN
  -- Get achiever's profile
  SELECT username, full_name INTO achiever_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Get badge level name
  SELECT name INTO badge_name
  FROM public.exam_badge_levels
  WHERE id = NEW.badge_level_id;

  -- Get category name
  SELECT name INTO category_name
  FROM public.exam_categories
  WHERE id = NEW.category_id;

  -- Notify all FOLLOWERS (people who follow the achiever)
  FOR follower_id IN 
    SELECT follower_id FROM public.follows WHERE following_id = NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data, related_user_id)
    VALUES (
      follower_id,
      'certificate_earned',
      COALESCE(achiever_profile.full_name, achiever_profile.username) || ' earned a certificate!',
      COALESCE(badge_name, 'Badge') || ' in ' || COALESCE(category_name, 'Exam'),
      jsonb_build_object(
        'certificate_id', NEW.id,
        'badge_level', badge_name,
        'category', category_name,
        'achiever_id', NEW.user_id
      ),
      NEW.user_id
    );
  END LOOP;

  -- Notify all FOLLOWING (people the achiever follows)
  FOR follower_id IN 
    SELECT following_id FROM public.follows WHERE follower_id = NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data, related_user_id)
    VALUES (
      follower_id,
      'certificate_earned',
      COALESCE(achiever_profile.full_name, achiever_profile.username) || ' earned a certificate!',
      COALESCE(badge_name, 'Badge') || ' in ' || COALESCE(category_name, 'Exam'),
      jsonb_build_object(
        'certificate_id', NEW.id,
        'badge_level', badge_name,
        'category', category_name,
        'achiever_id', NEW.user_id
      ),
      NEW.user_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER notify_followers_and_following_on_certificate
AFTER INSERT ON public.exam_certificates
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_and_following_on_certificate();