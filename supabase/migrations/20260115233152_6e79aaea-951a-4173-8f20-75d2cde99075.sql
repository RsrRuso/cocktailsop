-- Add sub_recipe_production_id to batch_production_losses to track losses from sub-recipe productions
ALTER TABLE public.batch_production_losses 
ADD COLUMN sub_recipe_production_id UUID REFERENCES public.sub_recipe_productions(id) ON DELETE CASCADE;

-- Make production_id nullable since loss can now come from either batch production or sub-recipe production
ALTER TABLE public.batch_production_losses
ALTER COLUMN production_id DROP NOT NULL;

-- Add sub_recipe_name column for better display
ALTER TABLE public.batch_production_losses 
ADD COLUMN sub_recipe_name TEXT;

-- Add expected_yield_ml and actual_yield_ml to track the calculation
ALTER TABLE public.batch_production_losses 
ADD COLUMN expected_yield_ml NUMERIC;

ALTER TABLE public.batch_production_losses 
ADD COLUMN actual_yield_ml NUMERIC;

-- Create index for efficient queries on sub_recipe_production_id
CREATE INDEX idx_batch_production_losses_sub_recipe_production_id 
ON public.batch_production_losses(sub_recipe_production_id);

-- Add check constraint to ensure at least one ID is present
ALTER TABLE public.batch_production_losses
ADD CONSTRAINT check_has_source 
CHECK (production_id IS NOT NULL OR sub_recipe_production_id IS NOT NULL);