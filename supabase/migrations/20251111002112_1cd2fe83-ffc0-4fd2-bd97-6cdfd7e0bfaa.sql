-- Fix security warnings by setting search_path for event count functions

-- Function to increment event like count
CREATE OR REPLACE FUNCTION increment_event_like_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET like_count = like_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

-- Function to decrement event like count
CREATE OR REPLACE FUNCTION decrement_event_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$;

-- Function to increment event comment count
CREATE OR REPLACE FUNCTION increment_event_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET comment_count = comment_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

-- Function to decrement event comment count
CREATE OR REPLACE FUNCTION decrement_event_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET comment_count = GREATEST(comment_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$;

-- Function to increment event attendee count
CREATE OR REPLACE FUNCTION increment_event_attendee_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET attendee_count = attendee_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

-- Function to decrement event attendee count
CREATE OR REPLACE FUNCTION decrement_event_attendee_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET attendee_count = GREATEST(attendee_count - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$;