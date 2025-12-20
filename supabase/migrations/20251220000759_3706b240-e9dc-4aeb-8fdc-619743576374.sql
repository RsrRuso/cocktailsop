-- Fix trigger function that references wrong column name (document_number instead of order_number)
CREATE OR REPLACE FUNCTION public.notify_po_order_created()
RETURNS TRIGGER AS $$
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
          WHEN v_workspace_member_id = NEW.user_id THEN 'You created PO: ' || COALESCE(NEW.order_number, 'Purchase Order')
          ELSE v_submitter_name || ' created PO: ' || COALESCE(NEW.order_number, 'Purchase Order')
        END
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;