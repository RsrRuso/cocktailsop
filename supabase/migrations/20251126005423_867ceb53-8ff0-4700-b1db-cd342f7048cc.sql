-- Fix workspace owner access for QR scanning and team member visibility

-- First, ensure workspace owners are always considered members
-- Update the is_workspace_member function to include owners
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = _workspace_id
    AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = _user_id
  )
$$;

-- Create a view that includes workspace owners in the members list
CREATE OR REPLACE VIEW workspace_members_with_owner AS
SELECT 
  wm.id,
  wm.workspace_id,
  wm.user_id,
  wm.role,
  wm.permissions,
  wm.joined_at,
  wm.invited_by
FROM workspace_members wm
UNION
SELECT 
  gen_random_uuid() as id,
  w.id as workspace_id,
  w.owner_id as user_id,
  'owner'::text as role,
  jsonb_build_object(
    'can_receive', true,
    'can_transfer', true,
    'can_manage', true,
    'can_delete', true
  ) as permissions,
  w.created_at as joined_at,
  NULL::uuid as invited_by
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm2
  WHERE wm2.workspace_id = w.id
  AND wm2.user_id = w.owner_id
);

-- Grant access to the view
GRANT SELECT ON workspace_members_with_owner TO authenticated;

-- Update RLS policies for inventory operations to include workspace owners
DROP POLICY IF EXISTS "Workspace members can insert inventory" ON inventory;
CREATE POLICY "Workspace members can insert inventory"
ON inventory FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);

DROP POLICY IF EXISTS "Workspace members can update inventory" ON inventory;
CREATE POLICY "Workspace members can update inventory"
ON inventory FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);

DROP POLICY IF EXISTS "Users can view their own inventory or workspace inventory" ON inventory;
CREATE POLICY "Users can view their own inventory or workspace inventory"
ON inventory FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);