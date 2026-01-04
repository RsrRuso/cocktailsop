-- Allow the channel creator to add themselves as the initial admin member for their own private channel
CREATE POLICY "Channel creator can join own private channel"
ON public.community_channel_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.community_channels cc
    WHERE cc.id = community_channel_members.channel_id
      AND cc.type = 'private'
      AND cc.created_by = auth.uid()
  )
);