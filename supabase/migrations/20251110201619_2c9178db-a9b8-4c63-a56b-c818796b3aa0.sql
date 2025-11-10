-- Fix teams RLS policies to allow creators to see and manage their teams

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
DROP POLICY IF EXISTS "Team owners and admins can update team" ON teams;
DROP POLICY IF EXISTS "Team owners can delete team" ON teams;

-- Allow authenticated users to create teams
CREATE POLICY "Authenticated users can create teams"
ON teams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow users to view teams they created OR are members of
CREATE POLICY "Users can view their teams"
ON teams
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by 
  OR 
  is_team_member(auth.uid(), id)
);

-- Allow team creators and team admins to update teams
CREATE POLICY "Team creators and admins can update teams"
ON teams
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  )
);

-- Allow team creators and owners to delete teams
CREATE POLICY "Team creators and owners can delete teams"
ON teams
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'owner'
  )
);