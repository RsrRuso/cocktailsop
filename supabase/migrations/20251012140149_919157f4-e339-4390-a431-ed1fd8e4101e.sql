-- Create trigger function for music share like count
CREATE OR REPLACE FUNCTION update_music_share_like_count()
RETURNS trigger
LANGUAGE plpgsql
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

-- Create trigger function for music share comment count
CREATE OR REPLACE FUNCTION update_music_share_comment_count()
RETURNS trigger
LANGUAGE plpgsql
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

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS music_share_likes_count_trigger ON music_share_likes;
DROP TRIGGER IF EXISTS music_share_comments_count_trigger ON music_share_comments;

-- Create trigger for likes
CREATE TRIGGER music_share_likes_count_trigger
AFTER INSERT OR DELETE ON music_share_likes
FOR EACH ROW
EXECUTE FUNCTION update_music_share_like_count();

-- Create trigger for comments
CREATE TRIGGER music_share_comments_count_trigger
AFTER INSERT OR DELETE ON music_share_comments
FOR EACH ROW
EXECUTE FUNCTION update_music_share_comment_count();

-- Fix all existing counts immediately
UPDATE music_shares
SET 
  like_count = COALESCE((
    SELECT COUNT(*)::integer
    FROM music_share_likes
    WHERE music_share_likes.music_share_id = music_shares.id
  ), 0),
  comment_count = COALESCE((
    SELECT COUNT(*)::integer
    FROM music_share_comments
    WHERE music_share_comments.music_share_id = music_shares.id
  ), 0);