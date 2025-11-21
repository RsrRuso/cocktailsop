
-- Function to auto-sync inventory from WAREHOUSE to JERRY store
CREATE OR REPLACE FUNCTION auto_sync_warehouse_to_jerry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  warehouse_store_id UUID := 'ec968463-fcb8-4297-b78a-d2e2e98e51e6';
  jerry_store_id UUID := '1a6aacfa-3d80-4a62-ba51-7bafd884068e';
BEGIN
  -- Only sync if inserting to WAREHOUSE
  IF NEW.store_id = warehouse_store_id THEN
    -- Insert corresponding inventory in JERRY store
    INSERT INTO inventory (
      item_id,
      store_id,
      quantity,
      expiration_date,
      received_date,
      batch_number,
      notes,
      photo_url,
      user_id,
      workspace_id,
      status,
      scanned_data
    ) VALUES (
      NEW.item_id,
      jerry_store_id,
      NEW.quantity,
      NEW.expiration_date,
      NEW.received_date,
      NEW.batch_number,
      COALESCE(NEW.notes, '') || ' (Auto-synced from WAREHOUSE)',
      NEW.photo_url,
      NEW.user_id,
      NEW.workspace_id,
      NEW.status,
      NEW.scanned_data
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on inventory table
DROP TRIGGER IF EXISTS trigger_sync_warehouse_to_jerry ON inventory;
CREATE TRIGGER trigger_sync_warehouse_to_jerry
  AFTER INSERT ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_warehouse_to_jerry();
