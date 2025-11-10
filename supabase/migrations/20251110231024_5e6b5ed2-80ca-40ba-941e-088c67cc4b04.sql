-- Add group messaging support to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_avatar_url text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_description text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON conversations(is_group);

-- Update RLS policies for group conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Group creators can update group info" ON conversations;
CREATE POLICY "Group creators can update group info" ON conversations
  FOR UPDATE
  USING (
    auth.uid() = created_by 
    OR (is_group = false AND auth.uid() = ANY(participant_ids))
  );

-- Create table for group member roles (optional but useful)
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Group admins can manage members" ON group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.conversation_id = group_members.conversation_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = group_members.conversation_id
      AND c.created_by = auth.uid()
    )
  );

-- Function to notify group members of new messages
CREATE OR REPLACE FUNCTION notify_group_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_username TEXT;
  participant_id UUID;
  conv RECORD;
BEGIN
  SELECT username INTO sender_username FROM profiles WHERE id = NEW.sender_id;
  SELECT * INTO conv FROM conversations WHERE id = NEW.conversation_id;
  
  IF conv.is_group THEN
    FOREACH participant_id IN ARRAY conv.participant_ids
    LOOP
      IF participant_id != NEW.sender_id THEN
        PERFORM create_notification(
          participant_id,
          'message',
          sender_username || ' in ' || conv.group_name || ': ' || LEFT(NEW.content, 50),
          NULL, NULL, NULL, NULL, NULL, NEW.sender_id
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for group message notifications
DROP TRIGGER IF EXISTS on_group_message_created ON messages;
CREATE TRIGGER on_group_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_message();