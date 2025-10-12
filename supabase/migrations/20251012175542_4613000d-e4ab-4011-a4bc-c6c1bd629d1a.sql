-- Create function to notify followers when user creates a new event
CREATE OR REPLACE FUNCTION public.notify_followers_new_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  creator_username TEXT;
  follower_user_id UUID;
BEGIN
  SELECT username INTO creator_username FROM public.profiles WHERE id = NEW.user_id;
  
  FOR follower_user_id IN 
    SELECT f.follower_id FROM public.follows f WHERE f.following_id = NEW.user_id
  LOOP
    PERFORM public.create_notification(
      follower_user_id,
      'new_event',
      creator_username || ' created a new event: ' || NEW.title,
      NULL,  -- post_id
      NULL,  -- reel_id
      NULL,  -- story_id
      NULL,  -- music_share_id
      NEW.id,  -- event_id
      NULL   -- reference_user_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Add trigger for new event notifications
CREATE TRIGGER on_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_event();