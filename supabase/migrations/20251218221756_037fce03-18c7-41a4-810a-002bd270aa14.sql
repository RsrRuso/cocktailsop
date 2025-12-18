-- Add PIN code column to workspace_members for FIFO and Store Management PIN access
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS pin_code text;

-- Create secure RPC function for workspace PIN verification (works for anon users)
CREATE OR REPLACE FUNCTION public.verify_workspace_member_pin(p_workspace_id uuid, p_pin_code text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role text,
  workspace_id uuid,
  member_name text,
  workspace_name text,
  workspace_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.user_id,
    wm.role,
    wm.workspace_id,
    COALESCE(p.full_name, p.username, 'Team Member') AS member_name,
    w.name AS workspace_name,
    w.workspace_type
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  LEFT JOIN profiles p ON p.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.pin_code = p_pin_code
    AND wm.pin_code IS NOT NULL
    AND wm.pin_code <> '';
END;
$$;

-- Grant execute to both anon and authenticated users
GRANT EXECUTE ON FUNCTION public.verify_workspace_member_pin(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_workspace_member_pin(uuid, text) TO authenticated;