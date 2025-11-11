-- Create triggers to automatically update event engagement counts

-- Function to increment event like count
CREATE OR REPLACE FUNCTION increment_event_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET like_count = like_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement event like count
CREATE OR REPLACE FUNCTION decrement_event_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to increment event comment count
CREATE OR REPLACE FUNCTION increment_event_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET comment_count = comment_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement event comment count
CREATE OR REPLACE FUNCTION decrement_event_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET comment_count = GREATEST(comment_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to increment event attendee count
CREATE OR REPLACE FUNCTION increment_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET attendee_count = attendee_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement event attendee count
CREATE OR REPLACE FUNCTION decrement_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET attendee_count = GREATEST(attendee_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS event_likes_insert_trigger ON event_likes;
DROP TRIGGER IF EXISTS event_likes_delete_trigger ON event_likes;
DROP TRIGGER IF EXISTS event_comments_insert_trigger ON event_comments;
DROP TRIGGER IF EXISTS event_comments_delete_trigger ON event_comments;
DROP TRIGGER IF EXISTS event_attendees_insert_trigger ON event_attendees;
DROP TRIGGER IF EXISTS event_attendees_delete_trigger ON event_attendees;

-- Create triggers for event likes
CREATE TRIGGER event_likes_insert_trigger
  AFTER INSERT ON event_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_event_like_count();

CREATE TRIGGER event_likes_delete_trigger
  AFTER DELETE ON event_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_event_like_count();

-- Create triggers for event comments
CREATE TRIGGER event_comments_insert_trigger
  AFTER INSERT ON event_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_event_comment_count();

CREATE TRIGGER event_comments_delete_trigger
  AFTER DELETE ON event_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_event_comment_count();

-- Create triggers for event attendees
CREATE TRIGGER event_attendees_insert_trigger
  AFTER INSERT ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION increment_event_attendee_count();

CREATE TRIGGER event_attendees_delete_trigger
  AFTER DELETE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION decrement_event_attendee_count();