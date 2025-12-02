-- Add reply_to and reactions columns to story_comments table
ALTER TABLE story_comments 
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES story_comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- Add index for reply_to lookups
CREATE INDEX IF NOT EXISTS idx_story_comments_reply_to ON story_comments(reply_to);

-- Enable realtime for story_comments if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE story_comments;