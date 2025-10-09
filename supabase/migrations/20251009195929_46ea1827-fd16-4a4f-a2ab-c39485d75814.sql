-- Add delivery status to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT false;

-- Allow users to update message read/delivered status
CREATE POLICY "Users can update message status in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND auth.uid() = ANY(conversations.participant_ids)
  )
);