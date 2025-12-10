-- Drop ALL duplicate triggers on post_comments
DROP TRIGGER IF EXISTS decrement_post_comment_count_trigger ON public.post_comments;
DROP TRIGGER IF EXISTS increment_post_comment_count_trigger ON public.post_comments;
DROP TRIGGER IF EXISTS on_post_comment_change ON public.post_comments;
DROP TRIGGER IF EXISTS on_post_comment_delete ON public.post_comments;
DROP TRIGGER IF EXISTS on_post_comment_insert ON public.post_comments;
DROP TRIGGER IF EXISTS post_comment_count_trigger ON public.post_comments;
DROP TRIGGER IF EXISTS post_comment_deleted ON public.post_comments;
DROP TRIGGER IF EXISTS post_comment_inserted ON public.post_comments;
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON public.post_comments;
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON public.post_comments;

-- Drop ALL duplicate triggers on reel_comments
DROP TRIGGER IF EXISTS decrement_reel_comment_count_trigger ON public.reel_comments;
DROP TRIGGER IF EXISTS increment_reel_comment_count_trigger ON public.reel_comments;
DROP TRIGGER IF EXISTS on_reel_comment_change ON public.reel_comments;
DROP TRIGGER IF EXISTS on_reel_comment_delete ON public.reel_comments;
DROP TRIGGER IF EXISTS on_reel_comment_insert ON public.reel_comments;
DROP TRIGGER IF EXISTS reel_comment_count_trigger ON public.reel_comments;
DROP TRIGGER IF EXISTS reel_comment_deleted ON public.reel_comments;
DROP TRIGGER IF EXISTS reel_comment_inserted ON public.reel_comments;
DROP TRIGGER IF EXISTS trigger_update_reel_comment_count ON public.reel_comments;
DROP TRIGGER IF EXISTS update_reel_comment_count_trigger ON public.reel_comments;

-- Create single unified trigger functions
CREATE OR REPLACE FUNCTION public.handle_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET comment_count = comment_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create ONE trigger for posts
CREATE TRIGGER single_post_comment_count_trigger
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_post_comment_count();

-- Create ONE trigger for reels
CREATE TRIGGER single_reel_comment_count_trigger
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_reel_comment_count();

-- Sync all counts to correct values
UPDATE posts SET comment_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = posts.id);
UPDATE reels SET comment_count = (SELECT COUNT(*) FROM reel_comments WHERE reel_id = reels.id);