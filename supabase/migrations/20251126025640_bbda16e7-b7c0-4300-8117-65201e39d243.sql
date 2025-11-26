-- Create function to notify user of new internal email
CREATE OR REPLACE FUNCTION public.notify_new_internal_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_username TEXT;
  sender_email TEXT;
BEGIN
  -- Get sender info
  SELECT username INTO sender_username FROM profiles WHERE id = NEW.sender_id;
  sender_email := sender_username || '@sv.internal';
  
  -- Create notification for recipient
  PERFORM create_notification(
    NEW.recipient_id,
    'internal_email',
    'New email from ' || sender_email || ': ' || NEW.subject,
    NULL, NULL, NULL, NULL, NULL, NEW.sender_id
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new internal emails
DROP TRIGGER IF EXISTS notify_internal_email_trigger ON internal_emails;
CREATE TRIGGER notify_internal_email_trigger
  AFTER INSERT ON internal_emails
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_internal_email();

-- Add index on internal_emails for better performance
CREATE INDEX IF NOT EXISTS idx_internal_emails_recipient ON internal_emails(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_emails_sender ON internal_emails(sender_id, created_at DESC);