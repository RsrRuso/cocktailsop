-- Fix search_path for increment_post_view_count function
CREATE OR REPLACE FUNCTION increment_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET view_count = view_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Fix search_path for increment_reel_view_count function
CREATE OR REPLACE FUNCTION increment_reel_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels
  SET view_count = view_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';