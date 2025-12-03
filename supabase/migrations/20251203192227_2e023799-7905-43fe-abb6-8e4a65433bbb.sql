-- Create triggers for reel likes count (missing)
DROP TRIGGER IF EXISTS increment_reel_like_trigger ON reel_likes;
DROP TRIGGER IF EXISTS decrement_reel_like_trigger ON reel_likes;

CREATE TRIGGER increment_reel_like_trigger
  AFTER INSERT ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_reel_like_count();

CREATE TRIGGER decrement_reel_like_trigger
  AFTER DELETE ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_reel_like_count();

-- Create triggers for post likes count (missing)
DROP TRIGGER IF EXISTS increment_post_like_trigger ON post_likes;
DROP TRIGGER IF EXISTS decrement_post_like_trigger ON post_likes;

CREATE TRIGGER increment_post_like_trigger
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_like_count();

CREATE TRIGGER decrement_post_like_trigger
  AFTER DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_post_like_count();

-- Create triggers for story likes count (missing)
DROP TRIGGER IF EXISTS increment_story_like_trigger ON story_likes;
DROP TRIGGER IF EXISTS decrement_story_like_trigger ON story_likes;

CREATE TRIGGER increment_story_like_trigger
  AFTER INSERT ON story_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_story_like_count();

CREATE TRIGGER decrement_story_like_trigger
  AFTER DELETE ON story_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_story_like_count();

-- Sync all counts to prevent future mismatches
UPDATE reels r SET like_count = (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id);
UPDATE posts p SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id);
UPDATE stories s SET like_count = (SELECT COUNT(*) FROM story_likes WHERE story_id = s.id);