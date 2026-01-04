-- Allow users to join private channels if they have a valid invitation
CREATE POLICY "Invited users can join private channels" 
ON public.community_channel_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.channel_invitations ci
    WHERE ci.channel_id = community_channel_members.channel_id
    AND ci.invited_user_id = auth.uid()
    AND ci.status IN ('pending', 'accepted')
  )
);