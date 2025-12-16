-- Add pin_code column to mixologist_group_members for staff PIN access
ALTER TABLE public.mixologist_group_members 
ADD COLUMN IF NOT EXISTS pin_code TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_mixologist_group_members_pin_lookup 
ON public.mixologist_group_members (group_id, pin_code, is_active);