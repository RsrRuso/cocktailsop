-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_notify_post_comment ON public.post_comments;
DROP TRIGGER IF EXISTS trigger_notify_new_follower ON public.follows;
DROP TRIGGER IF EXISTS trigger_notify_story_like ON public.story_likes;
DROP TRIGGER IF EXISTS trigger_notify_story_comment ON public.story_comments;
DROP TRIGGER IF EXISTS trigger_notify_reel_like ON public.reel_likes;
DROP TRIGGER IF EXISTS trigger_notify_reel_comment ON public.reel_comments;
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON public.profile_views;

-- Create all notification triggers
CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

CREATE TRIGGER trigger_notify_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();

CREATE TRIGGER trigger_notify_new_follower
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_follower();

CREATE TRIGGER trigger_notify_story_like
  AFTER INSERT ON public.story_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_story_like();

CREATE TRIGGER trigger_notify_story_comment
  AFTER INSERT ON public.story_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_story_comment();

CREATE TRIGGER trigger_notify_reel_like
  AFTER INSERT ON public.reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reel_like();

CREATE TRIGGER trigger_notify_reel_comment
  AFTER INSERT ON public.reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reel_comment();

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

CREATE TRIGGER trigger_notify_profile_view
  AFTER INSERT ON public.profile_views
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_profile_view();