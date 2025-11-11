-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON post_likes;
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON post_comments;
DROP TRIGGER IF EXISTS update_reel_like_count_trigger ON reel_likes;
DROP TRIGGER IF EXISTS update_reel_comment_count_trigger ON reel_comments;
DROP TRIGGER IF EXISTS update_story_like_count_trigger ON story_likes;
DROP TRIGGER IF EXISTS update_story_comment_count_trigger ON story_comments;
DROP TRIGGER IF EXISTS update_event_like_count_trigger ON event_likes;
DROP TRIGGER IF EXISTS update_event_comment_count_trigger ON event_comments;
DROP TRIGGER IF EXISTS update_event_attendee_count_trigger ON event_attendees;

-- Create all triggers for automatic count updates
CREATE TRIGGER update_post_like_count_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER update_post_comment_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

CREATE TRIGGER update_reel_like_count_trigger
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW
EXECUTE FUNCTION update_reel_like_count();

CREATE TRIGGER update_reel_comment_count_trigger
AFTER INSERT OR DELETE ON reel_comments
FOR EACH ROW
EXECUTE FUNCTION update_reel_comment_count();

CREATE TRIGGER update_story_like_count_trigger
AFTER INSERT OR DELETE ON story_likes
FOR EACH ROW
EXECUTE FUNCTION update_story_like_count();

CREATE TRIGGER update_story_comment_count_trigger
AFTER INSERT OR DELETE ON story_comments
FOR EACH ROW
EXECUTE FUNCTION update_story_comment_count();

CREATE TRIGGER update_event_like_count_trigger
AFTER INSERT OR DELETE ON event_likes
FOR EACH ROW
EXECUTE FUNCTION update_event_like_count();

CREATE TRIGGER update_event_comment_count_trigger
AFTER INSERT OR DELETE ON event_comments
FOR EACH ROW
EXECUTE FUNCTION update_event_comment_count();

CREATE TRIGGER update_event_attendee_count_trigger
AFTER INSERT OR DELETE ON event_attendees
FOR EACH ROW
EXECUTE FUNCTION update_event_attendee_count();