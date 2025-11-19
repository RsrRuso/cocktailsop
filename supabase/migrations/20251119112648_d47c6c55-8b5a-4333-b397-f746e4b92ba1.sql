-- Create trigger to notify managers when new access request is created
CREATE OR REPLACE FUNCTION notify_access_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Call edge function to send email notification
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-access-request',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on access_requests table
DROP TRIGGER IF EXISTS on_access_request_created ON public.access_requests;
CREATE TRIGGER on_access_request_created
  AFTER INSERT ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_access_request();