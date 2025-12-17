-- Notify user when added to workspace
CREATE OR REPLACE FUNCTION public.notify_workspace_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_name TEXT;
  v_inviter_name TEXT;
BEGIN
  SELECT name INTO v_workspace_name FROM workspaces WHERE id = NEW.workspace_id;
  
  IF NEW.invited_by IS NOT NULL THEN
    SELECT COALESCE(full_name, username, 'Someone') INTO v_inviter_name FROM profiles WHERE id = NEW.invited_by;
  ELSE
    v_inviter_name := 'Admin';
  END IF;
  
  INSERT INTO notifications (user_id, type, content, read)
  VALUES (
    NEW.user_id,
    'workspace_invite',
    v_inviter_name || ' added you to workspace: ' || COALESCE(v_workspace_name, 'Unknown'),
    false
  );
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_workspace_member_added_trigger
AFTER INSERT ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION notify_workspace_member_added();

-- Notify user when added to mixologist group
CREATE OR REPLACE FUNCTION public.notify_mixologist_group_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group_name TEXT;
BEGIN
  SELECT name INTO v_group_name FROM mixologist_groups WHERE id = NEW.group_id;
  
  INSERT INTO notifications (user_id, type, content, read)
  VALUES (
    NEW.user_id,
    'group_invite',
    'You have been added to group: ' || COALESCE(v_group_name, 'Unknown'),
    false
  );
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_mixologist_group_member_added_trigger
AFTER INSERT ON mixologist_group_members
FOR EACH ROW
EXECUTE FUNCTION notify_mixologist_group_member_added();

-- Notify PO creator when their PO is created
CREATE OR REPLACE FUNCTION public.notify_po_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (user_id, type, content, read)
  VALUES (
    NEW.user_id,
    'purchase_order',
    'Purchase order created: ' || COALESCE(NEW.document_number, 'PO') || ' - ' || COALESCE(NEW.supplier_name, 'Unknown supplier'),
    false
  );
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_po_creator_trigger
AFTER INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION notify_po_creator();

-- Notify user when they receive PO items
CREATE OR REPLACE FUNCTION public.notify_po_receiver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (user_id, type, content, read)
  VALUES (
    NEW.user_id,
    'receiving',
    'Items received: ' || COALESCE(NEW.document_number, 'Document') || ' - ' || COALESCE(NEW.received_by_name, 'Staff'),
    false
  );
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_po_receiver_trigger
AFTER INSERT ON po_received_records
FOR EACH ROW
EXECUTE FUNCTION notify_po_receiver();