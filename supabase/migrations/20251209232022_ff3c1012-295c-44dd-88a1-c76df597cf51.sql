-- ================================================
-- COMPLETE FIX FOR ALL ENGAGEMENT COUNT TRIGGERS
-- ================================================

-- STEP 1: Sync ALL counts with actual data first
UPDATE public.posts p SET like_count = (SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id);
UPDATE public.posts p SET comment_count = (SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id);
UPDATE public.posts p SET repost_count = (SELECT COUNT(*) FROM public.post_reposts pr WHERE pr.post_id = p.id);
UPDATE public.posts p SET save_count = (SELECT COUNT(*) FROM public.post_saves ps WHERE ps.post_id = p.id);

UPDATE public.reels r SET like_count = (SELECT COUNT(*) FROM public.reel_likes rl WHERE rl.reel_id = r.id);
UPDATE public.reels r SET comment_count = (SELECT COUNT(*) FROM public.reel_comments rc WHERE rc.reel_id = r.id);
UPDATE public.reels r SET repost_count = (SELECT COUNT(*) FROM public.reel_reposts rr WHERE rr.reel_id = r.id);
UPDATE public.reels r SET save_count = (SELECT COUNT(*) FROM public.reel_saves rs WHERE rs.reel_id = r.id);

-- STEP 2: Drop ALL existing triggers to prevent duplicates
-- Post likes
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS increment_post_like_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS decrement_post_like_count_trigger ON public.post_likes;

-- Post comments
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON public.post_comments;
DROP TRIGGER IF EXISTS increment_post_comment_count_trigger ON public.post_comments;
DROP TRIGGER IF EXISTS decrement_post_comment_count_trigger ON public.post_comments;

-- Post reposts
DROP TRIGGER IF EXISTS update_post_repost_count_trigger ON public.post_reposts;
DROP TRIGGER IF EXISTS increment_post_repost_count_trigger ON public.post_reposts;
DROP TRIGGER IF EXISTS decrement_post_repost_count_trigger ON public.post_reposts;

-- Post saves
DROP TRIGGER IF EXISTS update_post_save_count_trigger ON public.post_saves;
DROP TRIGGER IF EXISTS increment_post_save_count_trigger ON public.post_saves;
DROP TRIGGER IF EXISTS decrement_post_save_count_trigger ON public.post_saves;

-- Reel likes
DROP TRIGGER IF EXISTS update_reel_like_count_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS increment_reel_like_count_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS decrement_reel_like_count_trigger ON public.reel_likes;

-- Reel comments
DROP TRIGGER IF EXISTS update_reel_comment_count_trigger ON public.reel_comments;
DROP TRIGGER IF EXISTS increment_reel_comment_count_trigger ON public.reel_comments;
DROP TRIGGER IF EXISTS decrement_reel_comment_count_trigger ON public.reel_comments;

-- Reel reposts
DROP TRIGGER IF EXISTS update_reel_repost_count_trigger ON public.reel_reposts;
DROP TRIGGER IF EXISTS increment_reel_repost_count_trigger ON public.reel_reposts;
DROP TRIGGER IF EXISTS decrement_reel_repost_count_trigger ON public.reel_reposts;

-- Reel saves
DROP TRIGGER IF EXISTS update_reel_save_count_trigger ON public.reel_saves;
DROP TRIGGER IF EXISTS increment_reel_save_count_trigger ON public.reel_saves;
DROP TRIGGER IF EXISTS decrement_reel_save_count_trigger ON public.reel_saves;

-- STEP 3: Create unified trigger functions

-- Post likes
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- Post comments
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

-- Post reposts
CREATE OR REPLACE FUNCTION public.update_post_repost_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Post saves
CREATE OR REPLACE FUNCTION public.update_post_save_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Reel likes
CREATE OR REPLACE FUNCTION public.update_reel_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- Reel comments
CREATE OR REPLACE FUNCTION public.update_reel_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

-- Reel reposts
CREATE OR REPLACE FUNCTION public.update_reel_repost_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET repost_count = repost_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Reel saves
CREATE OR REPLACE FUNCTION public.update_reel_save_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET save_count = save_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- STEP 4: Create clean triggers (one per table)
CREATE TRIGGER update_post_like_count_trigger AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();
CREATE TRIGGER update_post_comment_count_trigger AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();
CREATE TRIGGER update_post_repost_count_trigger AFTER INSERT OR DELETE ON public.post_reposts FOR EACH ROW EXECUTE FUNCTION public.update_post_repost_count();
CREATE TRIGGER update_post_save_count_trigger AFTER INSERT OR DELETE ON public.post_saves FOR EACH ROW EXECUTE FUNCTION public.update_post_save_count();

CREATE TRIGGER update_reel_like_count_trigger AFTER INSERT OR DELETE ON public.reel_likes FOR EACH ROW EXECUTE FUNCTION public.update_reel_like_count();
CREATE TRIGGER update_reel_comment_count_trigger AFTER INSERT OR DELETE ON public.reel_comments FOR EACH ROW EXECUTE FUNCTION public.update_reel_comment_count();
CREATE TRIGGER update_reel_repost_count_trigger AFTER INSERT OR DELETE ON public.reel_reposts FOR EACH ROW EXECUTE FUNCTION public.update_reel_repost_count();
CREATE TRIGGER update_reel_save_count_trigger AFTER INSERT OR DELETE ON public.reel_saves FOR EACH ROW EXECUTE FUNCTION public.update_reel_save_count();