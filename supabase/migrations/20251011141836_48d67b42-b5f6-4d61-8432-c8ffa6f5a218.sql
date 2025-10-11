-- Recalculate all comment counts to fix any discrepancies
UPDATE reels SET comment_count = (
  SELECT COUNT(*) FROM reel_comments WHERE reel_id = reels.id
);

UPDATE posts SET comment_count = (
  SELECT COUNT(*) FROM post_comments WHERE post_id = posts.id
);

-- Ensure triggers are working by recreating them
DROP TRIGGER IF EXISTS update_reel_comment_count_trigger ON reel_comments;
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON post_comments;

CREATE TRIGGER update_reel_comment_count_trigger
AFTER INSERT OR DELETE ON reel_comments
FOR EACH ROW
EXECUTE FUNCTION update_reel_comment_count();

CREATE TRIGGER update_post_comment_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();