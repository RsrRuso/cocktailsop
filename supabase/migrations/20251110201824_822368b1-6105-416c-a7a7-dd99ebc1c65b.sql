-- Update team_members RLS policy to allow team creators to add members

DROP POLICY IF EXISTS "Team owners and admins can add members" ON team_members;

-- Allow team creators and team admins to add members
CREATE POLICY "Team creators and admins can add members"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can add themselves if they created the team
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM teams 
    WHERE teams.id = team_members.team_id 
    AND teams.created_by = auth.uid()
  ))
  OR
  -- OR user is already an owner/admin of the team
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);