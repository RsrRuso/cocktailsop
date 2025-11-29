-- Fix infinite recursion in mixologist_groups RLS policies
-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.mixologist_groups;

-- Create simplified policy that doesn't reference mixologist_group_members
CREATE POLICY "Users can view their created groups"
  ON public.mixologist_groups FOR SELECT
  USING (created_by = auth.uid());

-- Add separate policy for viewing groups as member (breaks recursion)
CREATE POLICY "Members can view their groups"
  ON public.mixologist_groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM public.mixologist_group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add QR code field for batch submission access
ALTER TABLE public.mixologist_groups
ADD COLUMN IF NOT EXISTS submission_qr_code TEXT;

-- Update batch_productions to link with groups properly
ALTER TABLE public.batch_productions
ADD CONSTRAINT fk_batch_productions_group_id 
FOREIGN KEY (group_id) 
REFERENCES public.mixologist_groups(id) 
ON DELETE SET NULL;