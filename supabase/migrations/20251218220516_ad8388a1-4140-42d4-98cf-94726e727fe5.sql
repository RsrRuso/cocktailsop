-- Fix the recursive SELECT policy by using the security definer function

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Workspace members can view all members in their workspace" ON public.workspace_members;

-- Create new policy using the security definer function (no recursion)
CREATE POLICY "Members can view workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);