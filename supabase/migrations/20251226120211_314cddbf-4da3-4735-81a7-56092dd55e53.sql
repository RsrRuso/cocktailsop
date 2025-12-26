-- Add prep_steps column to sub_recipes table
ALTER TABLE public.sub_recipes
ADD COLUMN IF NOT EXISTS prep_steps JSONB DEFAULT '[]'::jsonb;

-- Add prep_steps column to yield_recipes table
ALTER TABLE public.yield_recipes
ADD COLUMN IF NOT EXISTS prep_steps JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.sub_recipes.prep_steps IS 'Array of preparation steps with step number and description';
COMMENT ON COLUMN public.yield_recipes.prep_steps IS 'Array of preparation steps with step number and description';