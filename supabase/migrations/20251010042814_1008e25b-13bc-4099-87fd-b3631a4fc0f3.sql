-- Fix function search path
CREATE OR REPLACE FUNCTION update_story_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;