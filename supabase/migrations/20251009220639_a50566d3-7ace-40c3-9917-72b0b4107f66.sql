-- Sync actual like counts from post_likes table to posts table
UPDATE posts 
SET like_count = (
  SELECT COUNT(*) 
  FROM post_likes 
  WHERE post_likes.post_id = posts.id
);

-- Sync actual comment counts from post_comments table to posts table
UPDATE posts 
SET comment_count = (
  SELECT COUNT(*) 
  FROM post_comments 
  WHERE post_comments.post_id = posts.id
);