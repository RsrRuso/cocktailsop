-- Add career_score column to profiles table to store calculated scores
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS career_score INTEGER DEFAULT 0;

-- Create index for faster regional queries
CREATE INDEX IF NOT EXISTS idx_profiles_region_score ON profiles(region, career_score DESC);