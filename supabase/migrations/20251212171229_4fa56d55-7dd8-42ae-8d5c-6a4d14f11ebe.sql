
-- Create trigger function for PO order notifications
CREATE OR REPLACE FUNCTION public.notify_po_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_member_id UUID;
  v_user_username TEXT;
  v_supplier_name TEXT;
BEGIN
  -- Get user's username
  SELECT username INTO v_user_username FROM profiles WHERE id = NEW.user_id;
  v_supplier_name := COALESCE(NEW.supplier_name, 'Unknown Supplier');
  
  -- Notify all workspace members except the person who created the PO
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM procurement_workspace_members 
      WHERE workspace_id = NEW.workspace_id 
      AND user_id != NEW.user_id
    LOOP
      PERFORM create_notification(
        v_workspace_member_id,
        'purchase_order',
        '📦 ' || COALESCE(v_user_username, 'Someone') || ' recorded a new PO from ' || v_supplier_name
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for PO orders
DROP TRIGGER IF EXISTS notify_po_order_created_trigger ON purchase_orders;
CREATE TRIGGER notify_po_order_created_trigger
AFTER INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION notify_po_order_created();

-- Create trigger function for receiving notifications
CREATE OR REPLACE FUNCTION public.notify_po_receiving_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_member_id UUID;
  v_user_username TEXT;
BEGIN
  -- Get user's username
  SELECT username INTO v_user_username FROM profiles WHERE id = NEW.user_id;
  
  -- Notify all workspace members except the person who received
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM procurement_workspace_members 
      WHERE workspace_id = NEW.workspace_id 
      AND user_id != NEW.user_id
    LOOP
      PERFORM create_notification(
        v_workspace_member_id,
        'receiving',
        '✅ ' || COALESCE(v_user_username, 'Someone') || ' received items - Doc: ' || COALESCE(NEW.document_number, 'N/A')
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for receiving records
DROP TRIGGER IF EXISTS notify_po_receiving_created_trigger ON po_received_records;
CREATE TRIGGER notify_po_receiving_created_trigger
AFTER INSERT ON po_received_records
FOR EACH ROW
EXECUTE FUNCTION notify_po_receiving_created();
