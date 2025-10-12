-- Force complete resync of all music share counts with explicit casting
UPDATE music_shares
SET 
  like_count = COALESCE((
    SELECT COUNT(*)::integer
    FROM music_share_likes
    WHERE music_share_likes.music_share_id = music_shares.id
  ), 0),
  comment_count = COALESCE((
    SELECT COUNT(*)::integer
    FROM music_share_comments
    WHERE music_share_comments.music_share_id = music_shares.id
  ), 0);