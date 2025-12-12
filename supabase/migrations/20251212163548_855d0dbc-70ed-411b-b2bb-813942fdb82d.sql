-- Create procurement workspaces table
CREATE TABLE public.procurement_workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procurement workspace members table
CREATE TABLE public.procurement_workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.procurement_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Add workspace_id to purchase_orders table
ALTER TABLE public.purchase_orders 
ADD COLUMN workspace_id UUID REFERENCES public.procurement_workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to po_received_records table  
ALTER TABLE public.po_received_records
ADD COLUMN workspace_id UUID REFERENCES public.procurement_workspaces(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.procurement_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_workspace_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check procurement workspace membership
CREATE OR REPLACE FUNCTION public.is_procurement_workspace_member(p_user_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.procurement_workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.procurement_workspaces
    WHERE id = p_workspace_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS for procurement_workspaces
CREATE POLICY "Users can view workspaces they own or are members of"
ON public.procurement_workspaces FOR SELECT
USING (owner_id = auth.uid() OR is_procurement_workspace_member(auth.uid(), id));

CREATE POLICY "Users can create workspaces"
ON public.procurement_workspaces FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces"
ON public.procurement_workspaces FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
ON public.procurement_workspaces FOR DELETE
USING (owner_id = auth.uid());

-- RLS for procurement_workspace_members
CREATE POLICY "Members can view workspace members"
ON public.procurement_workspace_members FOR SELECT
USING (is_procurement_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Owners can add members"
ON public.procurement_workspace_members FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.procurement_workspaces
  WHERE id = workspace_id AND owner_id = auth.uid()
));

CREATE POLICY "Owners can remove members"
ON public.procurement_workspace_members FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.procurement_workspaces
  WHERE id = workspace_id AND owner_id = auth.uid()
) OR user_id = auth.uid());

-- Update purchase_orders RLS to include workspace access
DROP POLICY IF EXISTS "Users can delete own orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.purchase_orders;

CREATE POLICY "Users can view own or workspace orders"
ON public.purchase_orders FOR SELECT
USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can insert own or workspace orders"
ON public.purchase_orders FOR INSERT
WITH CHECK (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can update own or workspace orders"
ON public.purchase_orders FOR UPDATE
USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can delete own or workspace orders"
ON public.purchase_orders FOR DELETE
USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

-- Update po_received_records RLS to include workspace access
DROP POLICY IF EXISTS "Users can delete own received records" ON public.po_received_records;
DROP POLICY IF EXISTS "Users can insert own received records" ON public.po_received_records;
DROP POLICY IF EXISTS "Users can update own received records" ON public.po_received_records;
DROP POLICY IF EXISTS "Users can view own received records" ON public.po_received_records;

CREATE POLICY "Users can view own or workspace received records"
ON public.po_received_records FOR SELECT
USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can insert own or workspace received records"
ON public.po_received_records FOR INSERT
WITH CHECK (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can update own or workspace received records"
ON public.po_received_records FOR UPDATE
USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can delete own or workspace received records"
ON public.po_received_records FOR DELETE
USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_procurement_workspace_member(auth.uid(), workspace_id)));

-- Trigger for updated_at
CREATE TRIGGER update_procurement_workspaces_updated_at
BEFORE UPDATE ON public.procurement_workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();