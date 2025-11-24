-- Update stores RLS policies for read-only member access
DROP POLICY IF EXISTS "Users can view their own stores" ON stores;
DROP POLICY IF EXISTS "Users can insert their own stores" ON stores;
DROP POLICY IF EXISTS "Users can update their own stores" ON stores;
DROP POLICY IF EXISTS "Users can delete their own stores" ON stores;

-- Stores: Workspace members can view, only owners can modify
CREATE POLICY "Workspace members can view stores"
ON stores FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can insert stores"
ON stores FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can update stores"
ON stores FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can delete stores"
ON stores FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

-- Update items RLS policies for read-only member access
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can insert their own items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

-- Items: Workspace members can view, only owners can modify
CREATE POLICY "Workspace members can view items"
ON items FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can insert items"
ON items FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can update items"
ON items FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can delete items"
ON items FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

-- Update inventory RLS policies for read-only member access
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON inventory;

-- Inventory: Workspace members can view, only owners can modify
CREATE POLICY "Workspace members can view inventory"
ON inventory FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can insert inventory"
ON inventory FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can update inventory"
ON inventory FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can delete inventory"
ON inventory FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

-- Update inventory_activity_log RLS policies
DROP POLICY IF EXISTS "Users can view their own activity logs" ON inventory_activity_log;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON inventory_activity_log;

CREATE POLICY "Workspace members can view activity logs"
ON inventory_activity_log FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can insert activity logs"
ON inventory_activity_log FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

-- Update inventory_transfers RLS policies
DROP POLICY IF EXISTS "Users can view their own transfers" ON inventory_transfers;
DROP POLICY IF EXISTS "Users can insert their own transfers" ON inventory_transfers;
DROP POLICY IF EXISTS "Users can update their own transfers" ON inventory_transfers;

CREATE POLICY "Workspace members can view transfers"
ON inventory_transfers FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can insert transfers"
ON inventory_transfers FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);

CREATE POLICY "Only workspace owners can update transfers"
ON inventory_transfers FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  is_workspace_owner(auth.uid(), workspace_id)
);