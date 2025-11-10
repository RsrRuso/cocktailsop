-- Add date_of_birth column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.date_of_birth IS 'User birthday for special effects like fireworks animation';