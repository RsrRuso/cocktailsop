-- Add serving ratio and bottle ratio fields to lab_ops_menu_items for spirits/bottles
-- These fields allow calculating total servings from PO received bottles

ALTER TABLE public.lab_ops_menu_items 
ADD COLUMN IF NOT EXISTS serving_ratio_ml numeric DEFAULT 30,
ADD COLUMN IF NOT EXISTS bottle_ratio_ml numeric DEFAULT 750;

-- serving_ratio_ml: ml per serving (e.g., 30ml pour)
-- bottle_ratio_ml: ml per bottle (e.g., 750ml bottle)
-- Total servings = (bottle_ratio_ml / serving_ratio_ml) * bottles_received

COMMENT ON COLUMN public.lab_ops_menu_items.serving_ratio_ml IS 'ML per serving (pour size)';
COMMENT ON COLUMN public.lab_ops_menu_items.bottle_ratio_ml IS 'ML per bottle (bottle size)';