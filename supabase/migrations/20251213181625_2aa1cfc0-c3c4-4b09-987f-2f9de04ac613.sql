-- Update PO order created trigger to also notify the submitter
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
  -- Get submitter name
  v_submitter_name := COALESCE(NEW.submitted_by_name, 'Someone');
  
  -- Notify all workspace members INCLUDING the submitter
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
          WHEN v_workspace_member_id = NEW.user_id THEN 'You submitted a new purchase order: ' || COALESCE(NEW.order_number, 'Order')
          ELSE v_submitter_name || ' submitted a new purchase order: ' || COALESCE(NEW.order_number, 'Order')
        END
      );
    END LOOP;
  ELSE
    -- No workspace - notify just the submitter
    PERFORM create_notification(
      NEW.user_id,
      'purchase_order',
      'You submitted a new purchase order: ' || COALESCE(NEW.order_number, 'Order')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update receiving created trigger to also notify the submitter
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
  -- Get receiver name
  v_receiver_name := COALESCE(NEW.received_by_name, 'Someone');
  
  -- Notify all workspace members INCLUDING the receiver
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
  ELSE
    -- No workspace - notify just the receiver
    PERFORM create_notification(
      NEW.user_id,
      'receiving',
      'You received items: ' || COALESCE(NEW.document_number, 'Receiving')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;