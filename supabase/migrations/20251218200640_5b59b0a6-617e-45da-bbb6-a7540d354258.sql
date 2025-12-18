-- Allow all workspace members to view other members in the same workspace
CREATE POLICY "Workspace members can view all members in their workspace"
ON public.workspace_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
  )
);