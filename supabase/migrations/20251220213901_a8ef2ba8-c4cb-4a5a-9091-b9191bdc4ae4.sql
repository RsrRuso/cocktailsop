-- Fix: allow conversation creator to read the conversation immediately after creation
-- This prevents client-side inserts with `.select().single()` from failing before membership rows exist.

DROP POLICY IF EXISTS "Users can view their conversations" ON public.wasabi_conversations;

CREATE POLICY "Users can view their conversations"
ON public.wasabi_conversations
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.wasabi_members wm
    WHERE wm.conversation_id = wasabi_conversations.id
      AND wm.user_id = auth.uid()
  )
);
