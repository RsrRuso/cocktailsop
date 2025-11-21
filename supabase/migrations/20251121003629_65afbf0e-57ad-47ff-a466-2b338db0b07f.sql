-- Create trigger to notify workspace owner when access request is created
CREATE TRIGGER notify_workspace_owner_on_new_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_workspace_owner_access_request();

-- Create function to notify user when their request is approved/rejected
CREATE OR REPLACE FUNCTION public.notify_user_access_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_name TEXT;
BEGIN
  -- Only notify when status changes to approved or rejected
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) THEN
    -- Get workspace name
    SELECT name INTO v_workspace_name
    FROM workspaces
    WHERE id = NEW.workspace_id;
    
    -- Create notification for the requesting user
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        content,
        read
      ) VALUES (
        NEW.user_id,
        CASE 
          WHEN NEW.status = 'approved' THEN 'access_granted'
          ELSE 'access_denied'
        END,
        CASE 
          WHEN NEW.status = 'approved' THEN 'Your access request to "' || v_workspace_name || '" has been approved! 🎉'
          ELSE 'Your access request to "' || v_workspace_name || '" was declined.'
        END,
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to notify user when their request is decided
CREATE TRIGGER notify_user_on_access_decision
  AFTER UPDATE ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_access_decision();