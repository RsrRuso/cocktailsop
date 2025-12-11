-- Create status_likes table for liking statuses
CREATE TABLE IF NOT EXISTS public.status_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(status_id, user_id)
);

-- Create status_comments table for commenting on statuses
CREATE TABLE IF NOT EXISTS public.status_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.status_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for status_likes
CREATE POLICY "Anyone can view status likes"
ON public.status_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like statuses"
ON public.status_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON public.status_likes FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for status_comments
CREATE POLICY "Anyone can view status comments"
ON public.status_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add comments"
ON public.status_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.status_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.status_comments FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_likes_status_id ON public.status_likes(status_id);
CREATE INDEX IF NOT EXISTS idx_status_likes_user_id ON public.status_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_status_comments_status_id ON public.status_comments(status_id);
CREATE INDEX IF NOT EXISTS idx_status_comments_user_id ON public.status_comments(user_id);