-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invited_user_id UUID,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  CONSTRAINT valid_role CHECK (role IN ('member', 'admin', 'owner'))
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Team members can view invitations for their teams
CREATE POLICY "Team members can view invitations"
  ON public.team_invitations
  FOR SELECT
  USING (
    is_team_member(auth.uid(), team_id) OR 
    auth.uid() = invited_user_id OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = invited_email
  );

-- Team admins and owners can create invitations
CREATE POLICY "Team admins can create invitations"
  ON public.team_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Users can update invitations sent to them
CREATE POLICY "Users can update their invitations"
  ON public.team_invitations
  FOR UPDATE
  USING (
    auth.uid() = invited_user_id OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = invited_email
  );

-- Team admins can delete invitations
CREATE POLICY "Team admins can delete invitations"
  ON public.team_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically expire old invitations
CREATE OR REPLACE FUNCTION public.expire_team_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;