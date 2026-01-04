-- Create channel invitations table
CREATE TABLE public.channel_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.channel_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own invitations"
ON public.channel_invitations
FOR SELECT
USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "Channel admins can create invitations"
ON public.channel_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM community_channel_members
    WHERE community_channel_members.channel_id = channel_invitations.channel_id
    AND community_channel_members.user_id = auth.uid()
    AND community_channel_members.role = 'admin'
  )
);

CREATE POLICY "Users can update their own invitations"
ON public.channel_invitations
FOR UPDATE
USING (invited_user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_channel_invitations_user ON public.channel_invitations(invited_user_id);
CREATE INDEX idx_channel_invitations_channel ON public.channel_invitations(channel_id);