-- Add photo storage columns to area_equipment table for map planner
ALTER TABLE area_equipment 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

COMMENT ON COLUMN area_equipment.photos IS 'Array of up to 3 photo URLs attached to equipment';