-- Add bottle_size_ml column to inventory items for spirit conversion
ALTER TABLE public.lab_ops_inventory_items 
ADD COLUMN IF NOT EXISTS bottle_size_ml numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.lab_ops_inventory_items.bottle_size_ml IS 'Bottle size in milliliters for spirit serving calculations. Auto-detected or manually set.';