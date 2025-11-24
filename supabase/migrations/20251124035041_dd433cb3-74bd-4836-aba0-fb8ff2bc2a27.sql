-- Drop duplicate notification triggers to fix multiple notifications issue

-- Keep only one trigger for post_likes (post_like_notification)
DROP TRIGGER IF EXISTS notify_post_like_trigger ON post_likes;
DROP TRIGGER IF EXISTS on_post_like ON post_likes;

-- Keep only one trigger for reel_likes (on_reel_like) 
DROP TRIGGER IF EXISTS notify_reel_like_trigger ON reel_likes;

-- Verify: There should now be only one notification trigger per table
-- post_likes: post_like_notification
-- reel_likes: on_reel_like
-- story_likes: on_story_like