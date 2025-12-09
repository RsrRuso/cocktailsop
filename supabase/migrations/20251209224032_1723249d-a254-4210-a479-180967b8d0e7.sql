-- Sync like counts with actual records
UPDATE public.posts p
SET like_count = (SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id);

UPDATE public.reels r
SET like_count = (SELECT COUNT(*) FROM public.reel_likes rl WHERE rl.reel_id = r.id);

-- Sync repost counts
UPDATE public.posts p
SET repost_count = (SELECT COUNT(*) FROM public.post_reposts pr WHERE pr.post_id = p.id);

UPDATE public.reels r
SET repost_count = (SELECT COUNT(*) FROM public.reel_reposts rr WHERE rr.reel_id = r.id);

-- Sync save counts
UPDATE public.posts p
SET save_count = (SELECT COUNT(*) FROM public.post_saves ps WHERE ps.post_id = p.id);

UPDATE public.reels r
SET save_count = (SELECT COUNT(*) FROM public.reel_saves rs WHERE rs.reel_id = r.id);

-- Recreate trigger function for post likes with search_path
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

-- Recreate trigger function for reel likes
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

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON public.post_likes;
CREATE TRIGGER update_post_like_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

DROP TRIGGER IF EXISTS update_reel_like_count_trigger ON public.reel_likes;
CREATE TRIGGER update_reel_like_count_trigger
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION public.update_reel_like_count();