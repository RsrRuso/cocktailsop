-- Add critical indexes for posts and reels first
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at_user_id ON public.posts(created_at DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON public.reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at_user_id ON public.reels(created_at DESC, user_id);