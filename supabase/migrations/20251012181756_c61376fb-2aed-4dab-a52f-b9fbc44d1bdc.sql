-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS on_post_created ON public.posts;
DROP TRIGGER IF EXISTS on_reel_created ON public.reels;
DROP TRIGGER IF EXISTS on_story_created ON public.stories;
DROP TRIGGER IF EXISTS on_music_share_created ON public.music_shares;
DROP TRIGGER IF EXISTS on_event_created ON public.events;
DROP TRIGGER IF EXISTS on_new_follower ON public.follows;
DROP TRIGGER IF EXISTS on_unfollow ON public.follows;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_comment ON public.post_comments;
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;
DROP TRIGGER IF EXISTS on_reel_comment ON public.reel_comments;
DROP TRIGGER IF EXISTS on_story_like ON public.story_likes;
DROP TRIGGER IF EXISTS on_story_comment ON public.story_comments;
DROP TRIGGER IF EXISTS on_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS on_new_user ON public.profiles;

-- Recreate all triggers
CREATE TRIGGER on_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_post();

CREATE TRIGGER on_reel_created
  AFTER INSERT ON public.reels
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_reel();

CREATE TRIGGER on_story_created
  AFTER INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_story();

CREATE TRIGGER on_music_share_created
  AFTER INSERT ON public.music_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_music();

CREATE TRIGGER on_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_event();

CREATE TRIGGER on_new_follower
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_follower();

CREATE TRIGGER on_unfollow
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_unfollow();

CREATE TRIGGER on_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

CREATE TRIGGER on_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();

CREATE TRIGGER on_reel_like
  AFTER INSERT ON public.reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reel_like();

CREATE TRIGGER on_reel_comment
  AFTER INSERT ON public.reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reel_comment();

CREATE TRIGGER on_story_like
  AFTER INSERT ON public.story_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_story_like();

CREATE TRIGGER on_story_comment
  AFTER INSERT ON public.story_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_story_comment();

CREATE TRIGGER on_profile_view
  AFTER INSERT ON public.profile_views
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_profile_view();

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

CREATE TRIGGER on_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_founders_new_user();