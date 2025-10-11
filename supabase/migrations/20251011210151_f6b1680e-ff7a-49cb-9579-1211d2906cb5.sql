-- Add reactions and parent_comment_id to event_comments table
ALTER TABLE event_comments
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES event_comments(id) ON DELETE CASCADE;