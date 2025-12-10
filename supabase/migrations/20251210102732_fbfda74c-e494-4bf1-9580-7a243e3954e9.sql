-- Create function to update post like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update reel like count
CREATE OR REPLACE FUNCTION update_reel_like_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for post_likes
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

-- Create triggers for reel_likes
DROP TRIGGER IF EXISTS trigger_update_reel_like_count ON reel_likes;
CREATE TRIGGER trigger_update_reel_like_count
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW
EXECUTE FUNCTION update_reel_like_count();

-- Sync all existing counts
UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id);
UPDATE reels SET like_count = (SELECT COUNT(*) FROM reel_likes WHERE reel_likes.reel_id = reels.id);