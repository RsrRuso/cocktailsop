-- Fix RLS policies to avoid set-returning functions in WHERE clause
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update message status in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they're part of" ON conversations;

-- Create fixed policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE auth.uid() = ANY(participant_ids)
  )
);

CREATE POLICY "Users can update message status in their conversations"
ON messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE auth.uid() = ANY(participant_ids)
  )
);

-- Create fixed policies for conversations
CREATE POLICY "Users can view conversations they're part of"
ON conversations FOR SELECT
USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update conversations they're part of"
ON conversations FOR UPDATE
USING (auth.uid() = ANY(participant_ids));