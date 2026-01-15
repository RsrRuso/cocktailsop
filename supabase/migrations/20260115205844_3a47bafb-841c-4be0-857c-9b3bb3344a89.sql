-- Create table to track individual sub-recipe production batches
CREATE TABLE public.sub_recipe_productions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_recipe_id UUID NOT NULL REFERENCES public.sub_recipes(id) ON DELETE CASCADE,
  quantity_produced_ml NUMERIC NOT NULL,
  produced_by_user_id UUID,
  produced_by_name TEXT,
  production_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiration_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  group_id UUID REFERENCES public.mixologist_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_recipe_productions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view sub_recipe_productions for their sub-recipes" 
ON public.sub_recipe_productions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sub_recipes sr 
    WHERE sr.id = sub_recipe_id 
    AND (sr.user_id = auth.uid() OR sr.group_id IN (
      SELECT group_id FROM public.mixologist_group_members 
      WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can create sub_recipe_productions for their sub-recipes" 
ON public.sub_recipe_productions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sub_recipes sr 
    WHERE sr.id = sub_recipe_id 
    AND (sr.user_id = auth.uid() OR sr.group_id IN (
      SELECT group_id FROM public.mixologist_group_members 
      WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update sub_recipe_productions for their sub-recipes" 
ON public.sub_recipe_productions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.sub_recipes sr 
    WHERE sr.id = sub_recipe_id 
    AND (sr.user_id = auth.uid() OR sr.group_id IN (
      SELECT group_id FROM public.mixologist_group_members 
      WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can delete sub_recipe_productions for their sub-recipes" 
ON public.sub_recipe_productions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.sub_recipes sr 
    WHERE sr.id = sub_recipe_id 
    AND (sr.user_id = auth.uid() OR sr.group_id IN (
      SELECT group_id FROM public.mixologist_group_members 
      WHERE user_id = auth.uid()
    ))
  )
);

-- Create index for faster lookups
CREATE INDEX idx_sub_recipe_productions_sub_recipe_id ON public.sub_recipe_productions(sub_recipe_id);
CREATE INDEX idx_sub_recipe_productions_expiration ON public.sub_recipe_productions(expiration_date);