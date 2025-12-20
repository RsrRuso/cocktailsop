-- Fix the broken RLS policies on wasabi_conversations
-- The current policies incorrectly reference wasabi_members.id instead of wasabi_conversations.id

-- Drop the broken policies first
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.wasabi_conversations;
DROP POLICY IF EXISTS "Conversation admins can update" ON public.wasabi_conversations;

-- Recreate SELECT policy with correct column reference
CREATE POLICY "Users can view their conversations"
ON public.wasabi_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wasabi_members wm
    WHERE wm.conversation_id = wasabi_conversations.id
    AND wm.user_id = auth.uid()
  )
);

-- Recreate UPDATE policy with correct column reference
CREATE POLICY "Admins and creators can update conversations"
ON public.wasabi_conversations
FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.wasabi_members wm
    WHERE wm.conversation_id = wasabi_conversations.id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
);