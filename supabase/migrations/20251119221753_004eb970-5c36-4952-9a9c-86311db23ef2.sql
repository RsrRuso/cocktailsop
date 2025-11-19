-- Create trigger function to notify workspace owners of new access requests
CREATE OR REPLACE FUNCTION notify_workspace_owner_on_access_request()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_owner_id UUID;
  v_workspace_name TEXT;
  v_requester_email TEXT;
BEGIN
  -- Get workspace owner and name
  SELECT owner_id, name INTO v_workspace_owner_id, v_workspace_name
  FROM workspaces
  WHERE id = NEW.workspace_id;
  
  -- Get requester email
  v_requester_email := NEW.user_email;
  
  -- Create notification for workspace owner
  IF v_workspace_owner_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      content,
      read
    ) VALUES (
      v_workspace_owner_id,
      'access_request',
      v_requester_email || ' requested access to ' || v_workspace_name,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on access_requests table
DROP TRIGGER IF EXISTS on_access_request_created ON access_requests;
CREATE TRIGGER on_access_request_created
  AFTER INSERT ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_workspace_owner_on_access_request();