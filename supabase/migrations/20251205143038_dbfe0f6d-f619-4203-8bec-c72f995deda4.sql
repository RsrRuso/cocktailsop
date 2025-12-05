-- Create function to notify followers on new post
CREATE OR REPLACE FUNCTION notify_followers_on_new_post()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content, reference_user_id, post_id)
  SELECT 
    f.follower_id,
    'new_post',
    (SELECT COALESCE(full_name, username, 'Someone') FROM profiles WHERE id = NEW.user_id) || ' shared a new post',
    NEW.user_id,
    NEW.id
  FROM follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify followers on new reel
CREATE OR REPLACE FUNCTION notify_followers_on_new_reel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content, reference_user_id, reel_id)
  SELECT 
    f.follower_id,
    'new_reel',
    (SELECT COALESCE(full_name, username, 'Someone') FROM profiles WHERE id = NEW.user_id) || ' posted a new reel',
    NEW.user_id,
    NEW.id
  FROM follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify followers on new story
CREATE OR REPLACE FUNCTION notify_followers_on_new_story()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content, reference_user_id, story_id)
  SELECT 
    f.follower_id,
    'new_story',
    (SELECT COALESCE(full_name, username, 'Someone') FROM profiles WHERE id = NEW.user_id) || ' added to their story',
    NEW.user_id,
    NEW.id
  FROM follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify followers on new event
CREATE OR REPLACE FUNCTION notify_followers_on_new_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content, reference_user_id, event_id)
  SELECT 
    f.follower_id,
    'new_event',
    (SELECT COALESCE(full_name, username, 'Someone') FROM profiles WHERE id = NEW.user_id) || ' created a new event: ' || NEW.title,
    NEW.user_id,
    NEW.id
  FROM follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify followers on new music share
CREATE OR REPLACE FUNCTION notify_followers_on_new_music_share()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content, reference_user_id, music_share_id)
  SELECT 
    f.follower_id,
    'new_music',
    (SELECT COALESCE(full_name, username, 'Someone') FROM profiles WHERE id = NEW.user_id) || ' shared music: ' || COALESCE(NEW.track_name, 'a track'),
    NEW.user_id,
    NEW.id
  FROM follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_followers_new_post ON posts;
DROP TRIGGER IF EXISTS trigger_notify_followers_new_reel ON reels;
DROP TRIGGER IF EXISTS trigger_notify_followers_new_story ON stories;
DROP TRIGGER IF EXISTS trigger_notify_followers_new_event ON events;
DROP TRIGGER IF EXISTS trigger_notify_followers_new_music ON music_shares;

-- Create triggers
CREATE TRIGGER trigger_notify_followers_new_post
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_new_post();

CREATE TRIGGER trigger_notify_followers_new_reel
AFTER INSERT ON reels
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_new_reel();

CREATE TRIGGER trigger_notify_followers_new_story
AFTER INSERT ON stories
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_new_story();

CREATE TRIGGER trigger_notify_followers_new_event
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_new_event();

CREATE TRIGGER trigger_notify_followers_new_music
AFTER INSERT ON music_shares
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_new_music_share();