-- Recalculate all post like counts
UPDATE posts
SET like_count = (
  SELECT COUNT(*)
  FROM post_likes
  WHERE post_likes.post_id = posts.id
);

-- Recalculate all post comment counts
UPDATE posts
SET comment_count = (
  SELECT COUNT(*)
  FROM post_comments
  WHERE post_comments.post_id = posts.id
);

-- Recalculate all reel like counts
UPDATE reels
SET like_count = (
  SELECT COUNT(*)
  FROM reel_likes
  WHERE reel_likes.reel_id = reels.id
);

-- Recalculate all reel comment counts
UPDATE reels
SET comment_count = (
  SELECT COUNT(*)
  FROM reel_comments
  WHERE reel_comments.reel_id = reels.id
);

-- Recalculate all story like counts
UPDATE stories
SET like_count = (
  SELECT COUNT(*)
  FROM story_likes
  WHERE story_likes.story_id = stories.id
);

-- Recalculate all story comment counts
UPDATE stories
SET comment_count = (
  SELECT COUNT(*)
  FROM story_comments
  WHERE story_comments.story_id = stories.id
);

-- Recalculate all story view counts
UPDATE stories
SET view_count = (
  SELECT COUNT(*)
  FROM story_views
  WHERE story_views.story_id = stories.id
);