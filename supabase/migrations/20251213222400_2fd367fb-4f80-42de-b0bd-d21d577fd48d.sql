-- Drop ALL duplicate triggers on post_likes table (same as we did for reels)
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_like_change ON public.post_likes;
DROP TRIGGER IF EXISTS post_like_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS post_likes_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS increment_post_like_count ON public.post_likes;
DROP TRIGGER IF EXISTS decrement_post_like_count ON public.post_likes;

-- Create single unified trigger function
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create ONLY ONE trigger for post likes
CREATE TRIGGER post_like_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

-- Sync all post like counts to match actual likes
UPDATE posts p
SET like_count = (
  SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id
);