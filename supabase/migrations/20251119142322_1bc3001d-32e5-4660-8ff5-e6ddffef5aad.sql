-- Create workspaces table for team/group management
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Create workspace_members table for team membership
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  invited_by UUID,
  UNIQUE(workspace_id, user_id)
);

-- Add workspace_id to existing inventory tables
ALTER TABLE public.stores ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.items ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.inventory ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_transfers ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_activity_log ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Update access_requests to link to workspaces
ALTER TABLE public.access_requests ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = _user_id
  )
$$;

-- Helper function to check workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = _workspace_id
    AND owner_id = _user_id
  )
$$;

-- RLS Policies for workspaces
CREATE POLICY "Users can create workspaces"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can view workspaces they own or are members of"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR
    is_workspace_member(auth.uid(), id)
  );

CREATE POLICY "Workspace owners can update their workspaces"
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can delete their workspaces"
  ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- RLS Policies for workspace_members
CREATE POLICY "Workspace owners can add members"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_workspace_owner(auth.uid(), workspace_id)
  );

CREATE POLICY "Users can view members of their workspaces"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    is_workspace_member(auth.uid(), workspace_id) OR
    is_workspace_owner(auth.uid(), workspace_id)
  );

CREATE POLICY "Workspace owners can update members"
  ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (is_workspace_owner(auth.uid(), workspace_id));

CREATE POLICY "Workspace owners and members can remove themselves"
  ON public.workspace_members
  FOR DELETE
  TO authenticated
  USING (
    is_workspace_owner(auth.uid(), workspace_id) OR
    auth.uid() = user_id
  );

-- Update RLS for stores to check workspace membership
DROP POLICY IF EXISTS "Users can view own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can insert own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can delete own stores" ON public.stores;

CREATE POLICY "Users can view stores in their workspaces or own stores"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create stores in their workspaces or personal"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update stores in their workspaces or own stores"
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete stores in their workspaces or own stores"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS for items to check workspace membership
DROP POLICY IF EXISTS "Users can view own items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own items" ON public.items;
DROP POLICY IF EXISTS "Users can update own items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own items" ON public.items;

CREATE POLICY "Users can view items in their workspaces or own items"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create items in their workspaces or personal"
  ON public.items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update items in their workspaces or own items"
  ON public.items
  FOR UPDATE
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete items in their workspaces or own items"
  ON public.items
  FOR DELETE
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS for inventory
DROP POLICY IF EXISTS "Users can view own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON public.inventory;

CREATE POLICY "Users can view inventory in their workspaces or own inventory"
  ON public.inventory
  FOR SELECT
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create inventory in their workspaces or personal"
  ON public.inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update inventory in their workspaces or own inventory"
  ON public.inventory
  FOR UPDATE
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can delete inventory in their workspaces or own inventory"
  ON public.inventory
  FOR DELETE
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS for inventory_transfers
DROP POLICY IF EXISTS "Users can view their own transfers" ON public.inventory_transfers;
DROP POLICY IF EXISTS "Users can create their own transfers" ON public.inventory_transfers;
DROP POLICY IF EXISTS "Users can update their own transfers" ON public.inventory_transfers;

CREATE POLICY "Users can view transfers in their workspaces or own transfers"
  ON public.inventory_transfers
  FOR SELECT
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create transfers in their workspaces or personal"
  ON public.inventory_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update transfers in their workspaces or own transfers"
  ON public.inventory_transfers
  FOR UPDATE
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- Update RLS for inventory_activity_log
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.inventory_activity_log;
DROP POLICY IF EXISTS "Users can create their own activity logs" ON public.inventory_activity_log;

CREATE POLICY "Users can view activity logs in their workspaces or own logs"
  ON public.inventory_activity_log
  FOR SELECT
  TO authenticated
  USING (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create activity logs in their workspaces or personal"
  ON public.inventory_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (workspace_id IS NULL AND auth.uid() = user_id) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );