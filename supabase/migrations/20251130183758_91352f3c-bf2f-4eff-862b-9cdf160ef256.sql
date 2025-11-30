-- Drop existing RLS policies for batch_productions
DROP POLICY IF EXISTS "Users can view their own productions" ON public.batch_productions;
DROP POLICY IF EXISTS "Users can create their own productions" ON public.batch_productions;
DROP POLICY IF EXISTS "Users can update their own productions" ON public.batch_productions;
DROP POLICY IF EXISTS "Users can delete their own productions" ON public.batch_productions;
DROP POLICY IF EXISTS "Users can view group productions" ON public.batch_productions;
DROP POLICY IF EXISTS "Users can view productions from group members" ON public.batch_productions;

-- Create comprehensive RLS policy for batch_productions with group collaboration
-- Users can view:
-- 1. Their own productions
-- 2. All productions that belong to a group they're a member of (via group_id)
-- 3. All productions created by any member of groups they belong to
CREATE POLICY "Users can view batch productions with group access"
ON public.batch_productions
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Productions belonging to groups the user is a member of
  (
    group_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.mixologist_group_members mgm
      WHERE mgm.group_id = batch_productions.group_id
      AND mgm.user_id = auth.uid()
    )
  )
  OR
  -- Productions created by other members of groups the user belongs to
  EXISTS (
    SELECT 1 
    FROM public.mixologist_group_members mgm1
    JOIN public.mixologist_group_members mgm2 
      ON mgm1.group_id = mgm2.group_id
    WHERE mgm1.user_id = auth.uid()
    AND mgm2.user_id = batch_productions.user_id
  )
);

-- Users can insert their own productions with optional group_id
CREATE POLICY "Users can create batch productions"
ON public.batch_productions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own productions
CREATE POLICY "Users can update their own batch productions"
ON public.batch_productions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own productions
CREATE POLICY "Users can delete their own batch productions"
ON public.batch_productions
FOR DELETE
USING (auth.uid() = user_id);