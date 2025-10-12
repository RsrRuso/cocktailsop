-- Create only the missing triggers

-- Trigger for unfollows (missing)
CREATE TRIGGER trigger_notify_unfollow
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_unfollow();

-- Trigger for new posts (missing)
CREATE TRIGGER trigger_notify_followers_new_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_post();

-- Trigger for new reels (missing)
CREATE TRIGGER trigger_notify_followers_new_reel
  AFTER INSERT ON public.reels
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_reel();

-- Trigger for new music shares (missing)
CREATE TRIGGER trigger_notify_followers_new_music
  AFTER INSERT ON public.music_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_music();

-- Trigger for new stories (missing)
CREATE TRIGGER trigger_notify_followers_new_story
  AFTER INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_story();