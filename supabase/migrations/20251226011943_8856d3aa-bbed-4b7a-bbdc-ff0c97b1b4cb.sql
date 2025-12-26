-- Create table to track sub-recipe usage/depletions
CREATE TABLE public.sub_recipe_depletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_recipe_id UUID NOT NULL REFERENCES public.sub_recipes(id) ON DELETE CASCADE,
  production_id UUID REFERENCES public.batch_productions(id) ON DELETE SET NULL,
  amount_used_ml NUMERIC NOT NULL,
  ingredient_breakdown JSONB NOT NULL, -- Stores calculated breakdown of ingredients
  depleted_by_user_id UUID,
  depleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_recipe_depletions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sub-recipe depletions"
  ON public.sub_recipe_depletions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_recipes sr 
      WHERE sr.id = sub_recipe_id AND sr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sub-recipe depletions"
  ON public.sub_recipe_depletions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sub_recipes sr 
      WHERE sr.id = sub_recipe_id AND sr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own sub-recipe depletions"
  ON public.sub_recipe_depletions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_recipes sr 
      WHERE sr.id = sub_recipe_id AND sr.user_id = auth.uid()
    )
  );

-- Add index for performance
CREATE INDEX idx_sub_recipe_depletions_sub_recipe_id ON public.sub_recipe_depletions(sub_recipe_id);
CREATE INDEX idx_sub_recipe_depletions_production_id ON public.sub_recipe_depletions(production_id);