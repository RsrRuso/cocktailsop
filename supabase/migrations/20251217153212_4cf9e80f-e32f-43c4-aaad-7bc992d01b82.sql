-- Add batch_recipe_id column to link menu items to batch recipes
ALTER TABLE public.lab_ops_menu_items 
ADD COLUMN IF NOT EXISTS batch_recipe_id UUID REFERENCES public.batch_recipes(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lab_ops_menu_items_batch_recipe 
ON public.lab_ops_menu_items(batch_recipe_id);

-- Add serving_ml column to track serving size from batch
ALTER TABLE public.lab_ops_menu_items 
ADD COLUMN IF NOT EXISTS serving_ml NUMERIC DEFAULT 90;

-- Add remaining_serves column to track available inventory
ALTER TABLE public.lab_ops_menu_items 
ADD COLUMN IF NOT EXISTS remaining_serves INTEGER DEFAULT 0;

-- Add total_produced_serves for reference
ALTER TABLE public.lab_ops_menu_items 
ADD COLUMN IF NOT EXISTS total_produced_serves INTEGER DEFAULT 0;