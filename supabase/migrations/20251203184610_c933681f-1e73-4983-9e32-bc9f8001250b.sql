
-- Add unique constraint to prevent duplicate reels (same user, same video URL)
ALTER TABLE reels ADD CONSTRAINT reels_user_video_unique UNIQUE (user_id, video_url);
