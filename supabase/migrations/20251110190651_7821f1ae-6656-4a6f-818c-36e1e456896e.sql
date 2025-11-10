-- Fix team member RLS policy for initial owner creation
-- Allow creators to add themselves as owner when creating a team
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;

CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    -- Allow if user is the one being added and is the team creator
    (auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    ))
    OR
    -- Allow if user is already an owner/admin of the team
    (EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    ))
  );