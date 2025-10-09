-- Add reactions and reply support to post_comments
ALTER TABLE public.post_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
ADD COLUMN reactions jsonb DEFAULT '[]'::jsonb;

-- Add reactions and reply support to reel_comments
ALTER TABLE public.reel_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.reel_comments(id) ON DELETE CASCADE,
ADD COLUMN reactions jsonb DEFAULT '[]'::jsonb;

-- Add index for better performance on parent_comment_id lookups
CREATE INDEX idx_post_comments_parent ON public.post_comments(parent_comment_id);
CREATE INDEX idx_reel_comments_parent ON public.reel_comments(parent_comment_id);