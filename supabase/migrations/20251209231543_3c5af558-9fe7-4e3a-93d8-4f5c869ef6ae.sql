-- Fix like_count by syncing with actual data
UPDATE public.posts p
SET like_count = (SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id);

-- Drop all existing like triggers to avoid duplicates
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS increment_post_like_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS decrement_post_like_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS post_like_increment_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS post_like_decrement_trigger ON public.post_likes;

-- Drop duplicate functions
DROP FUNCTION IF EXISTS public.increment_post_like_count() CASCADE;
DROP FUNCTION IF EXISTS public.decrement_post_like_count() CASCADE;

-- Create single unified trigger function
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create single trigger for both insert and delete
CREATE TRIGGER update_post_like_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

-- Same for reels
DROP TRIGGER IF EXISTS update_reel_like_count_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS increment_reel_like_count_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS decrement_reel_like_count_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS reel_like_increment_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS reel_like_decrement_trigger ON public.reel_likes;

DROP FUNCTION IF EXISTS public.increment_reel_like_count() CASCADE;
DROP FUNCTION IF EXISTS public.decrement_reel_like_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_reel_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE TRIGGER update_reel_like_count_trigger
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION public.update_reel_like_count();

-- Sync reel counts too
UPDATE public.reels r
SET like_count = (SELECT COUNT(*) FROM public.reel_likes rl WHERE rl.reel_id = r.id);