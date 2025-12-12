
-- Add workspace_id column to purchase_order_master_items
ALTER TABLE purchase_order_master_items 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES procurement_workspaces(id) ON DELETE CASCADE;

-- Add workspace_id column to purchase_order_received_items  
ALTER TABLE purchase_order_received_items
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES procurement_workspaces(id) ON DELETE CASCADE;

-- Drop existing restrictive policies on purchase_order_master_items
DROP POLICY IF EXISTS "Users can view their own master items" ON purchase_order_master_items;
DROP POLICY IF EXISTS "Users can insert their own master items" ON purchase_order_master_items;
DROP POLICY IF EXISTS "Users can update their own master items" ON purchase_order_master_items;
DROP POLICY IF EXISTS "Users can delete their own master items" ON purchase_order_master_items;

-- Create workspace-aware policies for purchase_order_master_items
CREATE POLICY "Users can view own or workspace master items"
  ON purchase_order_master_items FOR SELECT
  USING (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace master items"
  ON purchase_order_master_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace master items"
  ON purchase_order_master_items FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace master items"
  ON purchase_order_master_items FOR DELETE
  USING (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

-- Drop existing restrictive policies on purchase_order_received_items
DROP POLICY IF EXISTS "Users can view their own received items" ON purchase_order_received_items;
DROP POLICY IF EXISTS "Users can insert their own received items" ON purchase_order_received_items;
DROP POLICY IF EXISTS "Users can update their own received items" ON purchase_order_received_items;
DROP POLICY IF EXISTS "Users can delete their own received items" ON purchase_order_received_items;

-- Create workspace-aware policies for purchase_order_received_items
CREATE POLICY "Users can view own or workspace received items"
  ON purchase_order_received_items FOR SELECT
  USING (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace received items"
  ON purchase_order_received_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace received items"
  ON purchase_order_received_items FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace received items"
  ON purchase_order_received_items FOR DELETE
  USING (
    user_id = auth.uid() 
    OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id))
  );

-- Update purchase_order_items policies to be workspace-aware (via purchase_orders join)
DROP POLICY IF EXISTS "Users can view items of own orders" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can create items for own orders" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can update items of own orders" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can delete items of own orders" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can view items of accessible orders" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can insert items for accessible orders" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can update items of accessible orders" ON purchase_order_items;
DROP POLICY IF EXISTS "Users can delete items of accessible orders" ON purchase_order_items;

CREATE POLICY "Users can view items of accessible orders"
  ON purchase_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND (po.user_id = auth.uid() OR (po.workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), po.workspace_id)))
    )
  );

CREATE POLICY "Users can insert items for accessible orders"
  ON purchase_order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND (po.user_id = auth.uid() OR (po.workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), po.workspace_id)))
    )
  );

CREATE POLICY "Users can update items of accessible orders"
  ON purchase_order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND (po.user_id = auth.uid() OR (po.workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), po.workspace_id)))
    )
  );

CREATE POLICY "Users can delete items of accessible orders"
  ON purchase_order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND (po.user_id = auth.uid() OR (po.workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), po.workspace_id)))
    )
  );
