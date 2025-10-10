-- Create security definer function to check conversation participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversations
    WHERE id = _conversation_id
    AND _user_id = ANY(participant_ids)
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they're part of" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update message status in their conversations" ON messages;

-- Create fixed policies using security definer function
CREATE POLICY "Users can view conversations they're part of"
ON conversations FOR SELECT
USING (public.is_conversation_participant(auth.uid(), id));

CREATE POLICY "Users can update conversations they're part of"
ON conversations FOR UPDATE
USING (public.is_conversation_participant(auth.uid(), id));

CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can update message status in their conversations"
ON messages FOR UPDATE
USING (public.is_conversation_participant(auth.uid(), conversation_id));