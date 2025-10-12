-- Fix story_comments foreign key relationship with profiles
ALTER TABLE public.story_comments
  DROP CONSTRAINT IF EXISTS story_comments_user_id_fkey,
  ADD CONSTRAINT story_comments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Fix story_likes foreign key relationship with profiles
ALTER TABLE public.story_likes
  DROP CONSTRAINT IF EXISTS story_likes_user_id_fkey,
  ADD CONSTRAINT story_likes_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_user_id ON public.story_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON public.story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON public.story_likes(user_id);

-- Ensure stories table has proper indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON public.stories(user_id, expires_at);