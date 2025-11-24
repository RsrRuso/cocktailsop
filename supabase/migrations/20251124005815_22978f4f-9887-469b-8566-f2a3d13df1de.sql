-- Fix workspace member access for QR code scanning
-- Allow users to view their own workspace memberships without circular RLS checks

-- Drop the existing complex policy if it exists
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;

-- Create a simple policy: users can always view their own memberships
CREATE POLICY "Users can view their own memberships"
ON workspace_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Workspace owners can view all members of their workspaces
CREATE POLICY "Workspace owners can view all members"
ON workspace_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);