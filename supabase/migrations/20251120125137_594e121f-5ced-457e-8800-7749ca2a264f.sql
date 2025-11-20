-- Add missing columns to cocktail_sops table
ALTER TABLE cocktail_sops 
ADD COLUMN IF NOT EXISTS texture_profile JSONB,
ADD COLUMN IF NOT EXISTS allergens TEXT;