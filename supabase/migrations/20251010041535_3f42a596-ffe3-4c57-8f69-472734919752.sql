-- Create story_views table to track who viewed each story
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_likes table to track who liked each story
CREATE TABLE IF NOT EXISTS story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;

-- Story views policies
CREATE POLICY "Users can view story views" 
  ON story_views FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own story views" 
  ON story_views FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Story likes policies
CREATE POLICY "Users can view story likes" 
  ON story_likes FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own story likes" 
  ON story_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own story likes" 
  ON story_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Add view_count and like_count to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create function to update story view count
CREATE OR REPLACE FUNCTION update_story_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories 
    SET view_count = view_count + 1 
    WHERE id = NEW.story_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create function to update story like count
CREATE OR REPLACE FUNCTION update_story_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories 
    SET like_count = like_count + 1 
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories 
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER story_views_count_trigger
  AFTER INSERT ON story_views
  FOR EACH ROW EXECUTE FUNCTION update_story_view_count();

CREATE TRIGGER story_likes_count_trigger
  AFTER INSERT OR DELETE ON story_likes
  FOR EACH ROW EXECUTE FUNCTION update_story_like_count();