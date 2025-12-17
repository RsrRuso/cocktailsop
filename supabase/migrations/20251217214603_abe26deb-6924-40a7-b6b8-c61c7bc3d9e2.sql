-- Update PO receiving notification - only notify workspace members
CREATE OR REPLACE FUNCTION public.notify_po_receiving_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_member_id UUID;
  v_receiver_name TEXT;
BEGIN
  v_receiver_name := COALESCE(NEW.received_by_name, 'Someone');
  
  -- Only notify workspace members
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM procurement_workspace_members 
      WHERE workspace_id = NEW.workspace_id
    LOOP
      PERFORM create_notification(
        v_workspace_member_id,
        'receiving',
        CASE 
          WHEN v_workspace_member_id = NEW.user_id THEN 'You received items: ' || COALESCE(NEW.document_number, 'Receiving')
          ELSE v_receiver_name || ' received items: ' || COALESCE(NEW.document_number, 'Receiving')
        END
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update PO creation notification - only notify workspace members
CREATE OR REPLACE FUNCTION public.notify_po_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_member_id UUID;
  v_submitter_name TEXT;
BEGIN
  v_submitter_name := COALESCE(NEW.submitted_by_name, 'Someone');
  
  -- Only notify workspace members
  IF NEW.workspace_id IS NOT NULL THEN
    FOR v_workspace_member_id IN 
      SELECT user_id 
      FROM procurement_workspace_members 
      WHERE workspace_id = NEW.workspace_id
    LOOP
      PERFORM create_notification(
        v_workspace_member_id,
        'purchase_order',
        CASE 
          WHEN v_workspace_member_id = NEW.user_id THEN 'You created PO: ' || COALESCE(NEW.document_number, 'Purchase Order')
          ELSE v_submitter_name || ' created PO: ' || COALESCE(NEW.document_number, 'Purchase Order')
        END
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;