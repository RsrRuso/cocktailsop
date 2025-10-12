-- Sync all music share counts with actual likes and comments
UPDATE music_shares
SET 
  like_count = (
    SELECT COUNT(*) 
    FROM music_share_likes 
    WHERE music_share_likes.music_share_id = music_shares.id
  ),
  comment_count = (
    SELECT COUNT(*) 
    FROM music_share_comments 
    WHERE music_share_comments.music_share_id = music_shares.id
  );