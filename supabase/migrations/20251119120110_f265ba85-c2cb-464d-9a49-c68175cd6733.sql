-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS on_access_request_created ON public.access_requests;
DROP FUNCTION IF EXISTS notify_access_request();

-- Create a simpler notification function without external HTTP calls
CREATE OR REPLACE FUNCTION handle_access_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a notification for managers
  INSERT INTO public.notifications (user_id, type, content)
  SELECT 
    ur.user_id,
    'access_request',
    'New access request from ' || COALESCE(NEW.user_email, 'a user')
  FROM public.user_roles ur
  WHERE ur.role IN ('manager', 'founder');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new trigger
CREATE TRIGGER on_access_request_created
  AFTER INSERT ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_access_request_notification();