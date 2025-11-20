-- Add versioning and costing fields to cocktail_sops
ALTER TABLE cocktail_sops 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES cocktail_sops(id),
ADD COLUMN IF NOT EXISTS cost_per_serving DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ingredient_costs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS nutritional_info JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS taste_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for version tracking
CREATE INDEX IF NOT EXISTS idx_cocktail_sops_version ON cocktail_sops(drink_name, version);
CREATE INDEX IF NOT EXISTS idx_cocktail_sops_parent ON cocktail_sops(parent_version_id);

-- Create a table for ingredient cost database
CREATE TABLE IF NOT EXISTS ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ingredient_name TEXT NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ml',
  supplier TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, ingredient_name)
);

-- Enable RLS
ALTER TABLE ingredient_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for ingredient_prices
CREATE POLICY "Users can view their own ingredient prices"
  ON ingredient_prices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ingredient prices"
  ON ingredient_prices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingredient prices"
  ON ingredient_prices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ingredient prices"
  ON ingredient_prices FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_ingredient_prices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
DROP TRIGGER IF EXISTS ingredient_prices_update_timestamp ON ingredient_prices;
CREATE TRIGGER ingredient_prices_update_timestamp
  BEFORE UPDATE ON ingredient_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_ingredient_prices_timestamp();