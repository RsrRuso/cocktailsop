-- Create post_comment_reactions table for Instagram-style single reaction per user per comment
CREATE TABLE public.post_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view all reactions
CREATE POLICY "Anyone can view reactions" 
ON public.post_comment_reactions 
FOR SELECT 
USING (true);

-- Users can manage their own reactions
CREATE POLICY "Users can insert their own reactions" 
ON public.post_comment_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" 
ON public.post_comment_reactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.post_comment_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for fast lookup
CREATE INDEX idx_post_comment_reactions_comment ON public.post_comment_reactions(comment_id);
CREATE INDEX idx_post_comment_reactions_user ON public.post_comment_reactions(user_id);