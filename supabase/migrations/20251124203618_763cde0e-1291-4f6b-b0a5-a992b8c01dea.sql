-- Create comment reactions table for event comments
CREATE TABLE IF NOT EXISTS event_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES event_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE event_comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view comment reactions"
  ON event_comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add comment reactions"
  ON event_comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment reactions"
  ON event_comment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Add reaction_count to event_comments if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_comments' 
    AND column_name = 'reaction_count'
  ) THEN
    ALTER TABLE event_comments ADD COLUMN reaction_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to update comment reaction count
CREATE OR REPLACE FUNCTION update_event_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event_comments 
    SET reaction_count = reaction_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event_comments 
    SET reaction_count = GREATEST(reaction_count - 1, 0)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for comment reactions
DROP TRIGGER IF EXISTS update_event_comment_reaction_count_trigger ON event_comment_reactions;
CREATE TRIGGER update_event_comment_reaction_count_trigger
  AFTER INSERT OR DELETE ON event_comment_reactions
  FOR EACH ROW EXECUTE FUNCTION update_event_comment_reaction_count();

-- Add reply_count to event_comments if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_comments' 
    AND column_name = 'reply_count'
  ) THEN
    ALTER TABLE event_comments ADD COLUMN reply_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to update comment reply count
CREATE OR REPLACE FUNCTION update_event_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE event_comments 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.parent_comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE event_comments 
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.parent_comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for comment replies
DROP TRIGGER IF EXISTS update_event_comment_reply_count_trigger ON event_comments;
CREATE TRIGGER update_event_comment_reply_count_trigger
  AFTER INSERT OR DELETE ON event_comments
  FOR EACH ROW EXECUTE FUNCTION update_event_comment_reply_count();

-- Initialize counts for existing data
UPDATE event_comments 
SET reaction_count = (
  SELECT COUNT(*) 
  FROM event_comment_reactions 
  WHERE comment_id = event_comments.id
)
WHERE reaction_count = 0;

UPDATE event_comments 
SET reply_count = (
  SELECT COUNT(*) 
  FROM event_comments AS replies 
  WHERE replies.parent_comment_id = event_comments.id
)
WHERE reply_count = 0;