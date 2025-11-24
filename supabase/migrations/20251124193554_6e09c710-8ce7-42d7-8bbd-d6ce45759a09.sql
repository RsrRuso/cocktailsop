
-- Fix security warnings by setting search_path on all trigger functions

CREATE OR REPLACE FUNCTION increment_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET like_count = like_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comment_count = comment_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET like_count = like_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET comment_count = comment_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION decrement_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels 
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
