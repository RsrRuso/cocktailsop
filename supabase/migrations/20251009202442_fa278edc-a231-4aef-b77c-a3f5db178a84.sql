-- Add new columns to messages table for reactions, replies, and editing
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Create index for reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);

-- Update RLS policy to allow deleting own messages (for unsend)
CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);