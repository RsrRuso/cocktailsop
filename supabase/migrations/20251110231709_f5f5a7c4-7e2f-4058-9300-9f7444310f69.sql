-- Create security definer function to check group admin status
CREATE OR REPLACE FUNCTION is_group_admin(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members
    WHERE conversation_id = _conversation_id
    AND user_id = _user_id
    AND role = 'admin'
  )
$$;

-- Update admin policies to use the function
DROP POLICY IF EXISTS "Admins can update members" ON group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON group_members;

CREATE POLICY "Admins can update members"
  ON group_members FOR UPDATE
  USING (is_group_admin(auth.uid(), conversation_id));

CREATE POLICY "Admins can remove members"
  ON group_members FOR DELETE
  USING (is_group_admin(auth.uid(), conversation_id));