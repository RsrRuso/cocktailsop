-- Create story comments table
CREATE TABLE public.story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reactions JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Comments are viewable by everyone"
  ON public.story_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.story_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.story_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment count to stories
ALTER TABLE public.stories 
ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_story_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Trigger for comment count
CREATE TRIGGER on_story_comment_change
  AFTER INSERT OR DELETE ON public.story_comments
  FOR EACH ROW EXECUTE FUNCTION update_story_comment_count();