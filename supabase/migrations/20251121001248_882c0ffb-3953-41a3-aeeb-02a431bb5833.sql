
-- Create trigger to notify workspace owner when access is requested
CREATE TRIGGER notify_workspace_owner_on_access_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workspace_owner_access_request();
