-- Fix team_invitations RLS policies to avoid auth.users access

-- Drop existing policies
DROP POLICY IF EXISTS "Team members can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update their invitations" ON team_invitations;

-- Allow team members and invited users to view invitations
CREATE POLICY "Team members can view invitations"
ON team_invitations
FOR SELECT
TO authenticated
USING (
  is_team_member(auth.uid(), team_id) 
  OR auth.uid() = invited_user_id
  OR auth.uid() = invited_by
);

-- Allow invited users to update their invitations (accept/decline)
CREATE POLICY "Users can update their invitations"
ON team_invitations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = invited_user_id
  OR auth.uid() = invited_by
);