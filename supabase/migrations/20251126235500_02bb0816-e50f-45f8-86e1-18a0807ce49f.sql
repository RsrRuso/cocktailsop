-- Add workspace support to FIFO tables
ALTER TABLE fifo_stores ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE fifo_items ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE fifo_inventory ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE fifo_employees ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE fifo_transfers ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE fifo_activity_log ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fifo_stores_workspace ON fifo_stores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fifo_items_workspace ON fifo_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fifo_inventory_workspace ON fifo_inventory(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fifo_employees_workspace ON fifo_employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fifo_transfers_workspace ON fifo_transfers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fifo_activity_log_workspace ON fifo_activity_log(workspace_id);

-- Update RLS policies for fifo_stores to support workspace members
DROP POLICY IF EXISTS "Users can view own FIFO stores" ON fifo_stores;
DROP POLICY IF EXISTS "Users can insert own FIFO stores" ON fifo_stores;
DROP POLICY IF EXISTS "Users can update own FIFO stores" ON fifo_stores;
DROP POLICY IF EXISTS "Users can delete own FIFO stores" ON fifo_stores;

CREATE POLICY "Users can view own or workspace FIFO stores" ON fifo_stores
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace FIFO stores" ON fifo_stores
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace FIFO stores" ON fifo_stores
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace FIFO stores" ON fifo_stores
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS policies for fifo_items
DROP POLICY IF EXISTS "Users can view own FIFO items" ON fifo_items;
DROP POLICY IF EXISTS "Users can insert own FIFO items" ON fifo_items;
DROP POLICY IF EXISTS "Users can update own FIFO items" ON fifo_items;
DROP POLICY IF EXISTS "Users can delete own FIFO items" ON fifo_items;

CREATE POLICY "Users can view own or workspace FIFO items" ON fifo_items
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace FIFO items" ON fifo_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace FIFO items" ON fifo_items
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace FIFO items" ON fifo_items
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS policies for fifo_inventory
DROP POLICY IF EXISTS "Users can view own FIFO inventory" ON fifo_inventory;
DROP POLICY IF EXISTS "Users can insert own FIFO inventory" ON fifo_inventory;
DROP POLICY IF EXISTS "Users can update own FIFO inventory" ON fifo_inventory;
DROP POLICY IF EXISTS "Users can delete own FIFO inventory" ON fifo_inventory;

CREATE POLICY "Users can view own or workspace FIFO inventory" ON fifo_inventory
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace FIFO inventory" ON fifo_inventory
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace FIFO inventory" ON fifo_inventory
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace FIFO inventory" ON fifo_inventory
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS policies for fifo_employees
DROP POLICY IF EXISTS "Users can view own FIFO employees" ON fifo_employees;
DROP POLICY IF EXISTS "Users can insert own FIFO employees" ON fifo_employees;
DROP POLICY IF EXISTS "Users can update own FIFO employees" ON fifo_employees;
DROP POLICY IF EXISTS "Users can delete own FIFO employees" ON fifo_employees;

CREATE POLICY "Users can view own or workspace FIFO employees" ON fifo_employees
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace FIFO employees" ON fifo_employees
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace FIFO employees" ON fifo_employees
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace FIFO employees" ON fifo_employees
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS policies for fifo_transfers
DROP POLICY IF EXISTS "Users can view own FIFO transfers" ON fifo_transfers;
DROP POLICY IF EXISTS "Users can insert own FIFO transfers" ON fifo_transfers;
DROP POLICY IF EXISTS "Users can update own FIFO transfers" ON fifo_transfers;
DROP POLICY IF EXISTS "Users can delete own FIFO transfers" ON fifo_transfers;

CREATE POLICY "Users can view own or workspace FIFO transfers" ON fifo_transfers
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace FIFO transfers" ON fifo_transfers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace FIFO transfers" ON fifo_transfers
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace FIFO transfers" ON fifo_transfers
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS policies for fifo_activity_log
DROP POLICY IF EXISTS "Users can view own FIFO activity" ON fifo_activity_log;
DROP POLICY IF EXISTS "Users can insert own FIFO activity" ON fifo_activity_log;
DROP POLICY IF EXISTS "Users can update own FIFO activity" ON fifo_activity_log;
DROP POLICY IF EXISTS "Users can delete own FIFO activity" ON fifo_activity_log;

CREATE POLICY "Users can view own or workspace FIFO activity" ON fifo_activity_log
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own or workspace FIFO activity" ON fifo_activity_log
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace FIFO activity" ON fifo_activity_log
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete own or workspace FIFO activity" ON fifo_activity_log
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );