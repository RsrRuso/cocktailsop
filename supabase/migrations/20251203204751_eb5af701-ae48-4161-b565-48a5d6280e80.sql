-- REMOVE ALL REMAINING DUPLICATE TRIGGERS
DROP TRIGGER IF EXISTS on_post_like ON post_likes;
DROP TRIGGER IF EXISTS on_post_unlike ON post_likes;
DROP TRIGGER IF EXISTS on_reel_like ON reel_likes;
DROP TRIGGER IF EXISTS on_reel_unlike ON reel_likes;

-- SYNC ALL COUNTS TO ACTUAL VALUES (fix the corrupted data)
UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id);
UPDATE reels SET like_count = (SELECT COUNT(*) FROM reel_likes WHERE reel_id = reels.id);