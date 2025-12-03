-- RECREATE ALL LIKE COUNT TRIGGERS - CLEAN SLATE

-- Drop any existing triggers first
DROP TRIGGER IF EXISTS increment_reel_like_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS decrement_reel_like_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;
DROP TRIGGER IF EXISTS on_reel_unlike ON public.reel_likes;
DROP TRIGGER IF EXISTS increment_post_like_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS decrement_post_like_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_unlike ON public.post_likes;
DROP TRIGGER IF EXISTS increment_story_like_trigger ON public.story_likes;
DROP TRIGGER IF EXISTS decrement_story_like_trigger ON public.story_likes;
DROP TRIGGER IF EXISTS on_story_like ON public.story_likes;
DROP TRIGGER IF EXISTS on_story_unlike ON public.story_likes;

-- Create REEL like triggers
CREATE TRIGGER on_reel_like
  AFTER INSERT ON public.reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_reel_like_count();

CREATE TRIGGER on_reel_unlike
  AFTER DELETE ON public.reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_reel_like_count();

-- Create POST like triggers
CREATE TRIGGER on_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_post_like_count();

CREATE TRIGGER on_post_unlike
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_post_like_count();

-- Create STORY like triggers
CREATE TRIGGER on_story_like
  AFTER INSERT ON public.story_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_story_like_count();

CREATE TRIGGER on_story_unlike
  AFTER DELETE ON public.story_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_story_like_count();

-- SYNC ALL COUNTS NOW
UPDATE public.reels r SET like_count = (SELECT COUNT(*) FROM public.reel_likes WHERE reel_id = r.id);
UPDATE public.posts p SET like_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p.id);
UPDATE public.stories s SET like_count = (SELECT COUNT(*) FROM public.story_likes WHERE story_id = s.id);