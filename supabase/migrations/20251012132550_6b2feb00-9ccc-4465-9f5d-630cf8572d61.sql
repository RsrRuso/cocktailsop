-- Drop existing triggers with CASCADE
DROP TRIGGER IF EXISTS update_music_share_like_count_trigger ON music_share_likes CASCADE;
DROP TRIGGER IF EXISTS update_music_share_comment_count_trigger ON music_share_comments CASCADE;

-- Create proper triggers
CREATE TRIGGER update_music_share_like_count_trigger
AFTER INSERT OR DELETE ON music_share_likes
FOR EACH ROW
EXECUTE FUNCTION update_music_share_like_count();

CREATE TRIGGER update_music_share_comment_count_trigger
AFTER INSERT OR DELETE ON music_share_comments
FOR EACH ROW
EXECUTE FUNCTION update_music_share_comment_count();