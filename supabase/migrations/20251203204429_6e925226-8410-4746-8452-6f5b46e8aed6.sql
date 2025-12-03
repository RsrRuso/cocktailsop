-- REMOVE ALL DUPLICATE TRIGGERS ON POST_LIKES
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON post_likes;
DROP TRIGGER IF EXISTS post_like_inserted ON post_likes;
DROP TRIGGER IF EXISTS post_like_deleted ON post_likes;

-- REMOVE ALL DUPLICATE TRIGGERS ON REEL_LIKES
DROP TRIGGER IF EXISTS update_reel_like_count_trigger ON reel_likes;
DROP TRIGGER IF EXISTS reel_like_inserted ON reel_likes;
DROP TRIGGER IF EXISTS reel_like_deleted ON reel_likes;

-- CREATE SINGLE CLEAN TRIGGERS
CREATE TRIGGER single_post_like_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER single_reel_like_trigger
  AFTER INSERT OR DELETE ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_like_count();

-- SYNC ALL COUNTS TO ACTUAL VALUES
UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id);
UPDATE reels SET like_count = (SELECT COUNT(*) FROM reel_likes WHERE reel_id = reels.id);