-- First, drop ALL duplicate triggers on post_likes
DROP TRIGGER IF EXISTS increment_post_like_count ON public.post_likes;
DROP TRIGGER IF EXISTS decrement_post_like_count ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_increment_post_like_count ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_decrement_post_like_count ON public.post_likes;
DROP TRIGGER IF EXISTS post_likes_increment_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS post_likes_decrement_trigger ON public.post_likes;

-- Drop ALL duplicate triggers on reel_likes
DROP TRIGGER IF EXISTS increment_reel_like_count ON public.reel_likes;
DROP TRIGGER IF EXISTS decrement_reel_like_count ON public.reel_likes;
DROP TRIGGER IF EXISTS trigger_increment_reel_like_count ON public.reel_likes;
DROP TRIGGER IF EXISTS trigger_decrement_reel_like_count ON public.reel_likes;
DROP TRIGGER IF EXISTS reel_likes_increment_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS reel_likes_decrement_trigger ON public.reel_likes;

-- Create single trigger functions for posts
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

-- Create single trigger functions for reels
CREATE OR REPLACE FUNCTION public.update_reel_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET like_count = like_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create SINGLE trigger for post_likes
CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_like_count();

-- Create SINGLE trigger for reel_likes
CREATE TRIGGER reel_likes_count_trigger
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_reel_like_count();

-- Sync all post like_counts to actual values
UPDATE posts p
SET like_count = (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id);

-- Sync all reel like_counts to actual values
UPDATE reels r
SET like_count = (SELECT COUNT(*) FROM reel_likes rl WHERE rl.reel_id = r.id);