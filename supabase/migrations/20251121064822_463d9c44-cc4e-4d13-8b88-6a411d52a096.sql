-- Function to automatically add warehouse receivings to Jerry store
CREATE OR REPLACE FUNCTION add_warehouse_receiving_to_jerry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  warehouse_store_id UUID := 'ec968463-fcb8-4297-b78a-d2e2e98e51e6';
  jerry_store_id UUID := '1a6aacfa-3d80-4a62-ba51-7bafd884068e';
  existing_inventory_id UUID;
BEGIN
  -- Only process if inserting to WAREHOUSE
  IF NEW.store_id = warehouse_store_id THEN
    -- Check if there's existing inventory in Jerry for this item with same expiration
    SELECT id INTO existing_inventory_id
    FROM inventory
    WHERE item_id = NEW.item_id
      AND store_id = jerry_store_id
      AND expiration_date = NEW.expiration_date
      AND COALESCE(batch_number, '') = COALESCE(NEW.batch_number, '')
    LIMIT 1;
    
    IF existing_inventory_id IS NOT NULL THEN
      -- Update existing inventory quantity
      UPDATE inventory
      SET quantity = quantity + NEW.quantity,
          updated_at = NOW()
      WHERE id = existing_inventory_id;
    ELSE
      -- Insert new inventory record in Jerry store
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
        COALESCE(NEW.notes, '') || ' (Auto-added from WAREHOUSE)',
        NEW.photo_url,
        NEW.user_id,
        NEW.workspace_id,
        NEW.status,
        NEW.scanned_data
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for warehouse receivings
CREATE TRIGGER trigger_add_warehouse_to_jerry
AFTER INSERT ON inventory
FOR EACH ROW
EXECUTE FUNCTION add_warehouse_receiving_to_jerry();