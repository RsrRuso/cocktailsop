-- Create triggers for post likes count
DROP TRIGGER IF EXISTS post_likes_count_trigger ON post_likes;
CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

-- Create triggers for post comments count
DROP TRIGGER IF EXISTS post_comments_count_trigger ON post_comments;
CREATE TRIGGER post_comments_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- Create triggers for reel likes count
DROP TRIGGER IF EXISTS reel_likes_count_trigger ON reel_likes;
CREATE TRIGGER reel_likes_count_trigger
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW
EXECUTE FUNCTION update_reel_like_count();

-- Create triggers for reel comments count
DROP TRIGGER IF EXISTS reel_comments_count_trigger ON reel_comments;
CREATE TRIGGER reel_comments_count_trigger
AFTER INSERT OR DELETE ON reel_comments
FOR EACH ROW
EXECUTE FUNCTION update_reel_comment_count();

-- Create trigger for post like notifications
DROP TRIGGER IF EXISTS notify_post_like_trigger ON post_likes;
CREATE TRIGGER notify_post_like_trigger
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();

-- Create trigger for post comment notifications
DROP TRIGGER IF EXISTS notify_post_comment_trigger ON post_comments;
CREATE TRIGGER notify_post_comment_trigger
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();

-- Create trigger for reel like notifications
DROP TRIGGER IF EXISTS notify_reel_like_trigger ON reel_likes;
CREATE TRIGGER notify_reel_like_trigger
AFTER INSERT ON reel_likes
FOR EACH ROW
EXECUTE FUNCTION notify_reel_like();

-- Create trigger for reel comment notifications
DROP TRIGGER IF EXISTS notify_reel_comment_trigger ON reel_comments;
CREATE TRIGGER notify_reel_comment_trigger
AFTER INSERT ON reel_comments
FOR EACH ROW
EXECUTE FUNCTION notify_reel_comment();