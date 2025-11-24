
-- =====================================================
-- COMPREHENSIVE FIX: All Likes, Comments, Shares
-- Ensures consistent, reliable counting everywhere
-- =====================================================

-- 1. STORY LIKES (increment/decrement)
CREATE OR REPLACE FUNCTION increment_story_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories 
  SET like_count = like_count + 1
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_story_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories 
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.story_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old triggers and create new ones
DROP TRIGGER IF EXISTS update_story_like_count_trigger ON story_likes;
DROP TRIGGER IF EXISTS story_likes_insert_trigger ON story_likes;
DROP TRIGGER IF EXISTS story_likes_delete_trigger ON story_likes;

CREATE TRIGGER story_likes_insert_trigger
AFTER INSERT ON story_likes
FOR EACH ROW EXECUTE FUNCTION increment_story_like_count();

CREATE TRIGGER story_likes_delete_trigger
AFTER DELETE ON story_likes
FOR EACH ROW EXECUTE FUNCTION decrement_story_like_count();


-- 2. STORY COMMENTS (increment/decrement)
CREATE OR REPLACE FUNCTION increment_story_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories 
  SET comment_count = comment_count + 1
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_story_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories 
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.story_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old triggers and create new ones
DROP TRIGGER IF EXISTS on_story_comment_change ON story_comments;
DROP TRIGGER IF EXISTS update_story_comment_count_trigger ON story_comments;
DROP TRIGGER IF EXISTS story_comments_insert_trigger ON story_comments;
DROP TRIGGER IF EXISTS story_comments_delete_trigger ON story_comments;

CREATE TRIGGER story_comments_insert_trigger
AFTER INSERT ON story_comments
FOR EACH ROW EXECUTE FUNCTION increment_story_comment_count();

CREATE TRIGGER story_comments_delete_trigger
AFTER DELETE ON story_comments
FOR EACH ROW EXECUTE FUNCTION decrement_story_comment_count();


-- 3. MUSIC SHARE LIKES (increment/decrement)
CREATE OR REPLACE FUNCTION increment_music_share_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE music_shares 
  SET like_count = like_count + 1
  WHERE id = NEW.music_share_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_music_share_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE music_shares 
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.music_share_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old triggers and create new ones
DROP TRIGGER IF EXISTS music_share_likes_count_trigger ON music_share_likes;
DROP TRIGGER IF EXISTS music_share_likes_insert_trigger ON music_share_likes;
DROP TRIGGER IF EXISTS music_share_likes_delete_trigger ON music_share_likes;

CREATE TRIGGER music_share_likes_insert_trigger
AFTER INSERT ON music_share_likes
FOR EACH ROW EXECUTE FUNCTION increment_music_share_like_count();

CREATE TRIGGER music_share_likes_delete_trigger
AFTER DELETE ON music_share_likes
FOR EACH ROW EXECUTE FUNCTION decrement_music_share_like_count();


-- 4. MUSIC SHARE COMMENTS (increment/decrement)
CREATE OR REPLACE FUNCTION increment_music_share_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE music_shares 
  SET comment_count = comment_count + 1
  WHERE id = NEW.music_share_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_music_share_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE music_shares 
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.music_share_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old triggers and create new ones
DROP TRIGGER IF EXISTS music_share_comments_count_trigger ON music_share_comments;
DROP TRIGGER IF EXISTS music_share_comments_insert_trigger ON music_share_comments;
DROP TRIGGER IF EXISTS music_share_comments_delete_trigger ON music_share_comments;

CREATE TRIGGER music_share_comments_insert_trigger
AFTER INSERT ON music_share_comments
FOR EACH ROW EXECUTE FUNCTION increment_music_share_comment_count();

CREATE TRIGGER music_share_comments_delete_trigger
AFTER DELETE ON music_share_comments
FOR EACH ROW EXECUTE FUNCTION decrement_music_share_comment_count();


-- 5. EVENT LIKES - Fix search_path on existing functions
CREATE OR REPLACE FUNCTION increment_event_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET like_count = like_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_event_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6. EVENT COMMENTS - Fix search_path on existing functions
CREATE OR REPLACE FUNCTION increment_event_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET comment_count = comment_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_event_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET comment_count = GREATEST(comment_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 7. EVENT ATTENDEES - Fix search_path on existing functions
CREATE OR REPLACE FUNCTION increment_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET attendee_count = attendee_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET attendee_count = GREATEST(attendee_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
