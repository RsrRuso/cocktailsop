-- Add assigned_tables column for table-based order routing
ALTER TABLE public.lab_ops_stations 
ADD COLUMN IF NOT EXISTS assigned_tables INTEGER[] DEFAULT '{}'::INTEGER[];