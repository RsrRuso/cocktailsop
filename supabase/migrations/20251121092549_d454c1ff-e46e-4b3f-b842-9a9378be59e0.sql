-- Create notifications for inventory transfers
CREATE OR REPLACE FUNCTION notify_inventory_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item_name TEXT;
  v_from_store_name TEXT;
  v_to_store_name TEXT;
  v_workspace_member_id UUID;
  v_user_username TEXT;
BEGIN
  -- Get item and store names
  SELECT name INTO v_item_name FROM items WHERE id = (
    SELECT item_id FROM inventory WHERE id = NEW.inventory_id LIMIT 1
  );
  SELECT name INTO v_from_store_name FROM stores WHERE id = NEW.from_store_id;
  SELECT name INTO v_to_store_name FROM stores WHERE id = NEW.to_store_id;
  SELECT username INTO v_user_username FROM profiles WHERE id = NEW.user_id;
  
  -- Notify all workspace members except the person who made the transfer
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM workspace_members 
      WHERE workspace_id = NEW.workspace_id 
      AND user_id != NEW.user_id
    LOOP
      PERFORM create_notification(
        v_workspace_member_id,
        'inventory_transfer',
        v_user_username || ' transferred ' || COALESCE(v_item_name, 'item') || ' from ' || 
        COALESCE(v_from_store_name, 'store') || ' to ' || COALESCE(v_to_store_name, 'store')
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for inventory transfers
DROP TRIGGER IF EXISTS notify_on_inventory_transfer ON inventory_transfers;
CREATE TRIGGER notify_on_inventory_transfer
  AFTER INSERT ON inventory_transfers
  FOR EACH ROW
  EXECUTE FUNCTION notify_inventory_transfer();

-- Create notifications for inventory receivings
CREATE OR REPLACE FUNCTION notify_inventory_receiving()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item_name TEXT;
  v_store_name TEXT;
  v_workspace_member_id UUID;
  v_user_username TEXT;
  v_quantity NUMERIC;
BEGIN
  -- Only notify for receiving actions
  IF NEW.action_type = 'received' THEN
    -- Get item and store names
    SELECT name INTO v_item_name FROM items WHERE id = (NEW.details->>'item_id')::uuid;
    SELECT name INTO v_store_name FROM stores WHERE id = NEW.store_id;
    SELECT username INTO v_user_username FROM profiles WHERE id = NEW.user_id;
    v_quantity := COALESCE((NEW.details->>'received_quantity')::numeric, NEW.quantity_after - COALESCE(NEW.quantity_before, 0));
    
    -- Notify all workspace members except the person who received
    IF NEW.workspace_id IS NOT NULL THEN
      FOR v_workspace_member_id IN 
        SELECT user_id 
        FROM workspace_members 
        WHERE workspace_id = NEW.workspace_id 
        AND user_id != NEW.user_id
      LOOP
        PERFORM create_notification(
          v_workspace_member_id,
          'inventory_receiving',
          v_user_username || ' received ' || v_quantity || ' units of ' || 
          COALESCE(v_item_name, 'item') || ' at ' || COALESCE(v_store_name, 'store')
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for inventory receivings
DROP TRIGGER IF EXISTS notify_on_inventory_receiving ON inventory_activity_log;
CREATE TRIGGER notify_on_inventory_receiving
  AFTER INSERT ON inventory_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_inventory_receiving();

-- Create notifications for spot checks
CREATE OR REPLACE FUNCTION notify_spot_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_store_name TEXT;
  v_workspace_member_id UUID;
  v_user_username TEXT;
BEGIN
  -- Get store name
  SELECT name INTO v_store_name FROM stores WHERE id = NEW.store_id;
  SELECT username INTO v_user_username FROM profiles WHERE id = NEW.user_id;
  
  -- Notify all workspace members except the person who did the check
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM workspace_members 
      WHERE workspace_id = NEW.workspace_id 
      AND user_id != NEW.user_id
    LOOP
      PERFORM create_notification(
        v_workspace_member_id,
        'spot_check',
        v_user_username || ' performed a spot check at ' || COALESCE(v_store_name, 'store')
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for spot checks
DROP TRIGGER IF EXISTS notify_on_spot_check ON inventory_spot_checks;
CREATE TRIGGER notify_on_spot_check
  AFTER INSERT ON inventory_spot_checks
  FOR EACH ROW
  EXECUTE FUNCTION notify_spot_check();