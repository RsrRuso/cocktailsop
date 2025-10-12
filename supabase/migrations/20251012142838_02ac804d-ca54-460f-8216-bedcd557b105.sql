-- Fix the trigger functions by adding SECURITY DEFINER so they can bypass RLS
DROP FUNCTION IF EXISTS public.update_music_share_like_count() CASCADE;
DROP FUNCTION IF EXISTS public.update_music_share_comment_count() CASCADE;

-- Recreate like count trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_music_share_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE music_shares 
    SET like_count = like_count + 1 
    WHERE id = NEW.music_share_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_shares 
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.music_share_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate comment count trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_music_share_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE music_shares 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.music_share_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_shares 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.music_share_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER music_share_likes_count_trigger
AFTER INSERT OR DELETE ON music_share_likes
FOR EACH ROW EXECUTE FUNCTION update_music_share_like_count();

CREATE TRIGGER music_share_comments_count_trigger
AFTER INSERT OR DELETE ON music_share_comments
FOR EACH ROW EXECUTE FUNCTION update_music_share_comment_count();

-- Fix all existing counts to match reality
UPDATE music_shares ms
SET like_count = (
  SELECT COUNT(*) FROM music_share_likes WHERE music_share_id = ms.id
),
comment_count = (
  SELECT COUNT(*) FROM music_share_comments WHERE music_share_id = ms.id
);