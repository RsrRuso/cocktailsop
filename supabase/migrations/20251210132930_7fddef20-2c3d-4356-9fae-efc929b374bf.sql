-- Add visibility column to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_stories_visibility ON public.stories(visibility);