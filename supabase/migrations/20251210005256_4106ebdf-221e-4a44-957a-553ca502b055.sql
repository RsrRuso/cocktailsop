-- Create trigger function to increment post comment count
CREATE OR REPLACE FUNCTION public.increment_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE posts 
  SET comment_count = comment_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

-- Create trigger function to decrement post comment count
CREATE OR REPLACE FUNCTION public.decrement_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE posts 
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Create triggers on post_comments table
CREATE TRIGGER increment_post_comment_count_trigger
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_post_comment_count();

CREATE TRIGGER decrement_post_comment_count_trigger
  AFTER DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_post_comment_count();