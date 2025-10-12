-- Force update all music share counts with explicit subqueries
UPDATE music_shares ms
SET 
  like_count = (
    SELECT COUNT(*)::integer
    FROM music_share_likes msl
    WHERE msl.music_share_id = ms.id
  ),
  comment_count = (
    SELECT COUNT(*)::integer
    FROM music_share_comments msc
    WHERE msc.music_share_id = ms.id
  )
WHERE true;