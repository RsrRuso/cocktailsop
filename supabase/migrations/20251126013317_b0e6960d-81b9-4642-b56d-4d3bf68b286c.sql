-- Ensure workspace owners are real members with manageable permissions

-- 1) Backfill workspace_members rows for any workspace owner missing a membership
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, invited_by, permissions)
SELECT 
  w.id AS workspace_id,
  w.owner_id AS user_id,
  'owner'::text AS role,
  COALESCE(w.created_at, now()) AS joined_at,
  NULL::uuid AS invited_by,
  jsonb_build_object(
    'can_receive', true,
    'can_transfer', true,
    'can_manage', true,
    'can_delete', true
  ) AS permissions
FROM workspaces w
WHERE w.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM workspace_members wm
    WHERE wm.workspace_id = w.id
      AND wm.user_id = w.owner_id
  );

-- 2) Simplify workspace_members_with_owner view to just reflect workspace_members
DROP VIEW IF EXISTS workspace_members_with_owner CASCADE;

CREATE VIEW workspace_members_with_owner AS
SELECT 
  id,
  workspace_id,
  user_id,
  role,
  permissions,
  joined_at,
  invited_by
FROM workspace_members;

GRANT SELECT ON workspace_members_with_owner TO authenticated;

-- 3) Automatically add the owner as a member when a new workspace is created
CREATE OR REPLACE FUNCTION public.add_owner_as_workspace_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = NEW.id
      AND wm.user_id = NEW.owner_id
  ) THEN
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, invited_by, permissions)
    VALUES (
      NEW.id,
      NEW.owner_id,
      'owner',
      COALESCE(NEW.created_at, now()),
      NULL::uuid,
      jsonb_build_object(
        'can_receive', true,
        'can_transfer', true,
        'can_manage', true,
        'can_delete', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_owner_as_workspace_member_trigger ON workspaces;

CREATE TRIGGER add_owner_as_workspace_member_trigger
AFTER INSERT ON workspaces
FOR EACH ROW
EXECUTE FUNCTION public.add_owner_as_workspace_member();