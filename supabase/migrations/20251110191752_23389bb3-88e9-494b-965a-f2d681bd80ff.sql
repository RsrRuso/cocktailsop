-- Drop and recreate the teams INSERT policy with better error handling
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;

CREATE POLICY "Users can create their own teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = created_by
  );

-- Also ensure the team_members policy allows the creator to add themselves
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;

CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is adding themselves and is the team creator
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