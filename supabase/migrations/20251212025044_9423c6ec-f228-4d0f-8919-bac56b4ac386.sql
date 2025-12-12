-- Fix function search path security warning
CREATE OR REPLACE FUNCTION update_master_item_price()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchase_order_master_items
  SET last_price = NEW.unit_price, updated_at = now()
  WHERE id = NEW.master_item_id AND NEW.unit_price IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;