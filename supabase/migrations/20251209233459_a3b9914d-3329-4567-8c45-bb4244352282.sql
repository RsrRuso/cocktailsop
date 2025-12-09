-- Create triggers for post saves
CREATE OR REPLACE FUNCTION public.increment_post_save_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_save_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE posts SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER increment_post_save_count_trigger
AFTER INSERT ON post_saves
FOR EACH ROW EXECUTE FUNCTION increment_post_save_count();

CREATE TRIGGER decrement_post_save_count_trigger
AFTER DELETE ON post_saves
FOR EACH ROW EXECUTE FUNCTION decrement_post_save_count();

-- Create triggers for post reposts
CREATE OR REPLACE FUNCTION public.increment_post_repost_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_repost_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE posts SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER increment_post_repost_count_trigger
AFTER INSERT ON post_reposts
FOR EACH ROW EXECUTE FUNCTION increment_post_repost_count();

CREATE TRIGGER decrement_post_repost_count_trigger
AFTER DELETE ON post_reposts
FOR EACH ROW EXECUTE FUNCTION decrement_post_repost_count();

-- Create triggers for reel saves
CREATE OR REPLACE FUNCTION public.increment_reel_save_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE reels SET save_count = save_count + 1 WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_reel_save_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE reels SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER increment_reel_save_count_trigger
AFTER INSERT ON reel_saves
FOR EACH ROW EXECUTE FUNCTION increment_reel_save_count();

CREATE TRIGGER decrement_reel_save_count_trigger
AFTER DELETE ON reel_saves
FOR EACH ROW EXECUTE FUNCTION decrement_reel_save_count();

-- Create triggers for reel reposts
CREATE OR REPLACE FUNCTION public.increment_reel_repost_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE reels SET repost_count = repost_count + 1 WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_reel_repost_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE reels SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER increment_reel_repost_count_trigger
AFTER INSERT ON reel_reposts
FOR EACH ROW EXECUTE FUNCTION increment_reel_repost_count();

CREATE TRIGGER decrement_reel_repost_count_trigger
AFTER DELETE ON reel_reposts
FOR EACH ROW EXECUTE FUNCTION decrement_reel_repost_count();

-- Sync existing data
UPDATE posts p SET save_count = (SELECT COUNT(*) FROM post_saves ps WHERE ps.post_id = p.id);
UPDATE posts p SET repost_count = (SELECT COUNT(*) FROM post_reposts pr WHERE pr.post_id = p.id);
UPDATE reels r SET save_count = (SELECT COUNT(*) FROM reel_saves rs WHERE rs.reel_id = r.id);
UPDATE reels r SET repost_count = (SELECT COUNT(*) FROM reel_reposts rr WHERE rr.reel_id = r.id);