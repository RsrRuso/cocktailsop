-- Fix all incorrect comment counts immediately
UPDATE reels SET comment_count = (
  SELECT COUNT(*) FROM reel_comments WHERE reel_id = reels.id
);

UPDATE posts SET comment_count = (
  SELECT COUNT(*) FROM post_comments WHERE post_id = posts.id
);