
-- Function to increment post like count
CREATE OR REPLACE FUNCTION increment_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET like_count = like_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement post like count
CREATE OR REPLACE FUNCTION decrement_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment post comment count
CREATE OR REPLACE FUNCTION increment_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comment_count = comment_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement post comment count
CREATE OR REPLACE FUNCTION decrement_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment reel like count
CREATE OR REPLACE FUNCTION increment_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET like_count = like_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement reel like count
CREATE OR REPLACE FUNCTION decrement_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment reel comment count
CREATE OR REPLACE FUNCTION increment_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET comment_count = comment_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement reel comment count
CREATE OR REPLACE FUNCTION decrement_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for post_likes
DROP TRIGGER IF EXISTS post_like_inserted ON post_likes;
CREATE TRIGGER post_like_inserted
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_like_count();

DROP TRIGGER IF EXISTS post_like_deleted ON post_likes;
CREATE TRIGGER post_like_deleted
  AFTER DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_post_like_count();

-- Create triggers for post_comments
DROP TRIGGER IF EXISTS post_comment_inserted ON post_comments;
CREATE TRIGGER post_comment_inserted
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_comment_count();

DROP TRIGGER IF EXISTS post_comment_deleted ON post_comments;
CREATE TRIGGER post_comment_deleted
  AFTER DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_post_comment_count();

-- Create triggers for reel_likes
DROP TRIGGER IF EXISTS reel_like_inserted ON reel_likes;
CREATE TRIGGER reel_like_inserted
  AFTER INSERT ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_reel_like_count();

DROP TRIGGER IF EXISTS reel_like_deleted ON reel_likes;
CREATE TRIGGER reel_like_deleted
  AFTER DELETE ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_reel_like_count();

-- Create triggers for reel_comments
DROP TRIGGER IF EXISTS reel_comment_inserted ON reel_comments;
CREATE TRIGGER reel_comment_inserted
  AFTER INSERT ON reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_reel_comment_count();

DROP TRIGGER IF EXISTS reel_comment_deleted ON reel_comments;
CREATE TRIGGER reel_comment_deleted
  AFTER DELETE ON reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_reel_comment_count();
