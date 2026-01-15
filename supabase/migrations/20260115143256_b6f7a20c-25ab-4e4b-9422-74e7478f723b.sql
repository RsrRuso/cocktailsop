-- Fix RLS policies that leak workspace/group data to non-members

-- 1. Drop overly permissive SELECT policy on mixologist_groups
DROP POLICY IF EXISTS "Anyone can view groups for PIN selection" ON public.mixologist_groups;

-- 2. Drop overly permissive SELECT policy on procurement_workspaces  
DROP POLICY IF EXISTS "Anyone can view procurement workspaces" ON public.procurement_workspaces;

-- The remaining policies properly enforce membership:
-- mixologist_groups: "Members can view their groups" uses is_mixologist_group_member()
-- mixologist_groups: "Users can view their created groups" checks created_by = auth.uid()
-- procurement_workspaces: "Users can view workspaces they own or are members of" checks owner_id OR is_procurement_workspace_member()

-- Verify policies are correct (these should already exist)
-- If the membership-based policies don't exist, create them:

DO $$
BEGIN
  -- Check if proper procurement workspace policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'procurement_workspaces' 
    AND policyname = 'Users can view workspaces they own or are members of'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view workspaces they own or are members of" 
      ON public.procurement_workspaces 
      FOR SELECT 
      USING (owner_id = auth.uid() OR is_procurement_workspace_member(auth.uid(), id))';
  END IF;
  
  -- Check if proper mixologist_groups policy for members exists  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mixologist_groups' 
    AND policyname = 'Members can view their groups'
  ) THEN
    EXECUTE 'CREATE POLICY "Members can view their groups" 
      ON public.mixologist_groups 
      FOR SELECT 
      USING (is_mixologist_group_member(auth.uid(), id))';
  END IF;
END $$;