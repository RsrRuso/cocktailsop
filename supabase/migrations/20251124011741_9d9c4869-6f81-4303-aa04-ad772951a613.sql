-- Clean up and recreate RLS policies for workspace-based permissions

-- STORES: Drop all existing policies first
DROP POLICY IF EXISTS "Workspace members can view stores" ON stores;
DROP POLICY IF EXISTS "Only workspace owners can insert stores" ON stores;
DROP POLICY IF EXISTS "Only workspace owners can update stores" ON stores;
DROP POLICY IF EXISTS "Only workspace owners can delete stores" ON stores;
DROP POLICY IF EXISTS "Users can view own stores" ON stores;
DROP POLICY IF EXISTS "Users can insert own stores" ON stores;
DROP POLICY IF EXISTS "Users can update own stores" ON stores;
DROP POLICY IF EXISTS "Users can delete own stores" ON stores;
DROP POLICY IF EXISTS "Users can view stores in their workspaces" ON stores;
DROP POLICY IF EXISTS "Users can view stores in their workspaces or own stores" ON stores;
DROP POLICY IF EXISTS "Users can insert stores in their workspaces" ON stores;
DROP POLICY IF EXISTS "Users can insert stores in their workspaces or own stores" ON stores;
DROP POLICY IF EXISTS "Users can update stores in their workspaces" ON stores;
DROP POLICY IF EXISTS "Users can update stores in their workspaces or own stores" ON stores;
DROP POLICY IF EXISTS "Users can delete stores in their workspaces" ON stores;
DROP POLICY IF EXISTS "Users can delete stores in their workspaces or own stores" ON stores;

-- Create new policies: Members READ, Owners WRITE
CREATE POLICY "workspace_stores_select"
ON stores FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace_stores_insert_owner_only"
ON stores FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

CREATE POLICY "workspace_stores_update_owner_only"
ON stores FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

CREATE POLICY "workspace_stores_delete_owner_only"
ON stores FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

-- ITEMS: Drop all existing policies
DROP POLICY IF EXISTS "Workspace members can view items" ON items;
DROP POLICY IF EXISTS "Only workspace owners can insert items" ON items;
DROP POLICY IF EXISTS "Only workspace owners can update items" ON items;
DROP POLICY IF EXISTS "Only workspace owners can delete items" ON items;
DROP POLICY IF EXISTS "Users can view own items" ON items;
DROP POLICY IF EXISTS "Users can insert own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;
DROP POLICY IF EXISTS "Users can view items in their workspaces" ON items;
DROP POLICY IF EXISTS "Users can view items in their workspaces or own items" ON items;
DROP POLICY IF EXISTS "Users can insert items in their workspaces" ON items;
DROP POLICY IF EXISTS "Users can create items in their workspaces or personal" ON items;
DROP POLICY IF EXISTS "Users can update items in their workspaces" ON items;
DROP POLICY IF EXISTS "Users can update items in their workspaces or own items" ON items;
DROP POLICY IF EXISTS "Users can delete items in their workspaces" ON items;
DROP POLICY IF EXISTS "Users can delete items in their workspaces or own items" ON items;

-- Create new policies: Members READ, Owners WRITE
CREATE POLICY "workspace_items_select"
ON items FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace_items_insert_owner_only"
ON items FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

CREATE POLICY "workspace_items_update_owner_only"
ON items FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

CREATE POLICY "workspace_items_delete_owner_only"
ON items FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

-- INVENTORY: Drop all existing policies
DROP POLICY IF EXISTS "Workspace members can view inventory" ON inventory;
DROP POLICY IF EXISTS "Only workspace owners can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Only workspace owners can update inventory" ON inventory;
DROP POLICY IF EXISTS "Only workspace owners can delete inventory" ON inventory;
DROP POLICY IF EXISTS "Users can view own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can view inventory in their workspaces" ON inventory;
DROP POLICY IF EXISTS "Users can view inventory in their workspaces or own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory in their workspaces" ON inventory;
DROP POLICY IF EXISTS "Users can create inventory in their workspaces or personal" ON inventory;
DROP POLICY IF EXISTS "Users can update inventory in their workspaces" ON inventory;
DROP POLICY IF EXISTS "Users can update inventory in their workspaces or own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete inventory in their workspaces" ON inventory;
DROP POLICY IF EXISTS "Users can delete inventory in their workspaces or own inventory" ON inventory;

-- Create new policies: Members READ, Owners WRITE (but members can indirectly modify via transfers/receiving)
CREATE POLICY "workspace_inventory_select"
ON inventory FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace_inventory_insert_owner_only"
ON inventory FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

CREATE POLICY "workspace_inventory_update_owner_only"
ON inventory FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));

CREATE POLICY "workspace_inventory_delete_owner_only"
ON inventory FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_owner(auth.uid(), workspace_id)));