-- Create triggers to automatically update post engagement counts

-- Function to update post like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET like_count = like_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for post likes
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for post comments
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON post_comments;
CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();