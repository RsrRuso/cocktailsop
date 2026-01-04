-- Fix channel creation: allow channel creator to insert themselves as the initial admin member for BOTH public and private channels

DROP POLICY IF EXISTS "Channel creator can join own private channel" ON public.community_channel_members;

CREATE POLICY "Channel creator can join own channel"
ON public.community_channel_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.community_channels cc
    WHERE cc.id = community_channel_members.channel_id
      AND cc.created_by = auth.uid()
  )
);