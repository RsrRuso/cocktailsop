-- Add missing indexes for 10k+ user scalability

-- Profiles: Index on updated_at for presence checks (last seen feature)
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles (updated_at DESC);

-- Conversations: Index for finding user's conversations quickly
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids ON public.conversations USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations (last_message_at DESC);

-- Music share comments: Add indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_music_share_comments_share_id ON public.music_share_comments (music_share_id);
CREATE INDEX IF NOT EXISTS idx_music_share_comments_user_id ON public.music_share_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_music_share_comments_created ON public.music_share_comments (created_at DESC);

-- Music share likes: Add index for faster like checks
CREATE INDEX IF NOT EXISTS idx_music_share_likes_share_id ON public.music_share_likes (music_share_id);
CREATE INDEX IF NOT EXISTS idx_music_share_likes_user_id ON public.music_share_likes (user_id);

-- Composite index for feed queries (posts by followed users)
CREATE INDEX IF NOT EXISTS idx_posts_user_active ON public.posts (user_id, created_at DESC);

-- User locations: Partial index for non-ghost users
CREATE INDEX IF NOT EXISTS idx_user_locations_visible ON public.user_locations (user_id, last_updated DESC) 
WHERE ghost_mode = false;

-- Stories: Index on expires_at for filtering expired stories
CREATE INDEX IF NOT EXISTS idx_stories_user_created ON public.stories (user_id, created_at DESC);