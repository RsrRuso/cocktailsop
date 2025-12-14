-- Create story highlights table for saving stories permanently
CREATE TABLE public.story_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id UUID NOT NULL,
  title VARCHAR(100) DEFAULT 'Highlights',
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;

-- Users can view their own highlights and others can view public highlights
CREATE POLICY "Users can view all highlights"
  ON public.story_highlights
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own highlights"
  ON public.story_highlights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
  ON public.story_highlights
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_story_highlights_user_id ON public.story_highlights(user_id);
CREATE INDEX idx_story_highlights_story_id ON public.story_highlights(story_id);