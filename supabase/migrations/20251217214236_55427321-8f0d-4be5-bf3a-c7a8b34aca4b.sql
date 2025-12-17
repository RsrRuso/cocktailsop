-- Drop my duplicate triggers (keep the existing workspace-based ones)
DROP TRIGGER IF EXISTS notify_po_creator_trigger ON purchase_orders;
DROP TRIGGER IF EXISTS notify_po_receiver_trigger ON po_received_records;
DROP FUNCTION IF EXISTS notify_po_creator();
DROP FUNCTION IF EXISTS notify_po_receiver();

-- Improve existing notify_po_receiving_created to also notify user directly when no workspace
CREATE OR REPLACE FUNCTION public.notify_po_receiving_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_member_id UUID;
  v_receiver_name TEXT;
  v_notified_receiver BOOLEAN := false;
BEGIN
  v_receiver_name := COALESCE(NEW.received_by_name, 'Someone');
  
  -- Notify all workspace members INCLUDING the receiver
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM procurement_workspace_members 
      WHERE workspace_id = NEW.workspace_id
    LOOP
      IF v_workspace_member_id = NEW.user_id THEN
        v_notified_receiver := true;
      END IF;
      
      PERFORM create_notification(
        v_workspace_member_id,
        'receiving',
        CASE 
          WHEN v_workspace_member_id = NEW.user_id THEN 'You received items: ' || COALESCE(NEW.document_number, 'Receiving')
          ELSE v_receiver_name || ' received items: ' || COALESCE(NEW.document_number, 'Receiving')
        END
      );
    END LOOP;
    
    -- If receiver wasn't notified as workspace member, notify them directly
    IF NOT v_notified_receiver AND NEW.user_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.user_id,
        'receiving',
        'You received items: ' || COALESCE(NEW.document_number, 'Receiving')
      );
    END IF;
  ELSE
    -- No workspace - notify just the receiver
    IF NEW.user_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.user_id,
        'receiving',
        'You received items: ' || COALESCE(NEW.document_number, 'Receiving')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create/update PO creation notification to notify workspace members
CREATE OR REPLACE FUNCTION public.notify_po_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_member_id UUID;
  v_submitter_name TEXT;
  v_notified_submitter BOOLEAN := false;
BEGIN
  v_submitter_name := COALESCE(NEW.submitted_by_name, 'Someone');
  
  -- Notify all workspace members INCLUDING the submitter
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM procurement_workspace_members 
      WHERE workspace_id = NEW.workspace_id
    LOOP
      IF v_workspace_member_id = NEW.user_id THEN
        v_notified_submitter := true;
      END IF;
      
      PERFORM create_notification(
        v_workspace_member_id,
        'purchase_order',
        CASE 
          WHEN v_workspace_member_id = NEW.user_id THEN 'You created PO: ' || COALESCE(NEW.document_number, 'Purchase Order')
          ELSE v_submitter_name || ' created PO: ' || COALESCE(NEW.document_number, 'Purchase Order')
        END
      );
    END LOOP;
    
    -- If submitter wasn't notified as workspace member, notify them directly
    IF NOT v_notified_submitter AND NEW.user_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.user_id,
        'purchase_order',
        'You created PO: ' || COALESCE(NEW.document_number, 'Purchase Order')
      );
    END IF;
  ELSE
    -- No workspace - notify just the submitter
    IF NEW.user_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.user_id,
        'purchase_order',
        'You created PO: ' || COALESCE(NEW.document_number, 'Purchase Order')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate trigger for PO creation
DROP TRIGGER IF EXISTS notify_po_order_created_trigger ON purchase_orders;
CREATE TRIGGER notify_po_order_created_trigger
AFTER INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION notify_po_order_created();