-- Add bottle_size column to lab_ops_recipe_ingredients
ALTER TABLE public.lab_ops_recipe_ingredients 
ADD COLUMN IF NOT EXISTS bottle_size NUMERIC DEFAULT 750;