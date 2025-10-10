-- Fix the notify_new_message function to avoid set-returning function error
DROP FUNCTION IF EXISTS public.notify_new_message() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  sender_username TEXT;
  recipient_id UUID;
  participant UUID;
BEGIN
  -- Get sender username
  SELECT username INTO sender_username FROM profiles WHERE id = NEW.sender_id;
  
  -- Loop through participant_ids to find the recipient
  FOREACH participant IN ARRAY (
    SELECT participant_ids FROM conversations WHERE id = NEW.conversation_id
  )
  LOOP
    IF participant != NEW.sender_id THEN
      recipient_id := participant;
      EXIT; -- Found the recipient, exit loop
    END IF;
  END LOOP;
  
  -- Create notification if recipient exists
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, content)
    VALUES (
      recipient_id,
      'message',
      sender_username || ' sent you a message'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();