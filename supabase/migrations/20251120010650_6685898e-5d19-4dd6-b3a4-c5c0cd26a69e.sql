-- Fix search_path security issue for update_ingredient_prices_timestamp function
CREATE OR REPLACE FUNCTION update_ingredient_prices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public';