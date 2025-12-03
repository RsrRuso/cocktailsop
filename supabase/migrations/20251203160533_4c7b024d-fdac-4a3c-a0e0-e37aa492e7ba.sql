-- Add group_id column to batch_recipes table
ALTER TABLE public.batch_recipes 
ADD COLUMN group_id uuid REFERENCES public.mixologist_groups(id) ON DELETE SET NULL;

-- Create index for faster group lookups
CREATE INDEX idx_batch_recipes_group_id ON public.batch_recipes(group_id);

-- Update RLS policy to allow group members to view recipes
DROP POLICY IF EXISTS "Users can view their own recipes and group recipes" ON public.batch_recipes;

CREATE POLICY "Users can view their own recipes and group recipes" 
ON public.batch_recipes 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (group_id IS NOT NULL AND is_mixologist_group_member(auth.uid(), group_id))
);