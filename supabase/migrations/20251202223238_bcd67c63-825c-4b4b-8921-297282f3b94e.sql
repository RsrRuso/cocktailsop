-- Fix the automation_on_new_message function that has incorrect unnest usage
CREATE OR REPLACE FUNCTION public.automation_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id UUID;
  conv_participants UUID[];
  participant UUID;
BEGIN
  -- Get conversation participants
  SELECT participant_ids INTO conv_participants 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Find recipient (first participant that is not the sender)
  IF conv_participants IS NOT NULL THEN
    FOREACH participant IN ARRAY conv_participants
    LOOP
      IF participant != NEW.sender_id THEN
        recipient_id := participant;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Fire automation trigger for recipient if found
  IF recipient_id IS NOT NULL THEN
    PERFORM fire_automation_trigger(
      'new_message',
      recipient_id,
      jsonb_build_object(
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'content', NEW.content,
        'created_at', NEW.created_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix notify_new_message function with proper search_path
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_username TEXT;
  recipient_id UUID;
  conv_participants UUID[];
  participant UUID;
BEGIN
  SELECT username INTO sender_username FROM profiles WHERE id = NEW.sender_id;
  
  -- Get conversation participants
  SELECT participant_ids INTO conv_participants 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Find recipient
  IF conv_participants IS NOT NULL THEN
    FOREACH participant IN ARRAY conv_participants
    LOOP
      IF participant != NEW.sender_id THEN
        recipient_id := participant;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
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

-- Fix notify_founders_new_user with proper search_path
CREATE OR REPLACE FUNCTION public.notify_founders_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  founder_id UUID;
  new_username TEXT;
BEGIN
  -- Get the new user's username
  new_username := NEW.username;
  
  -- Notify all founders
  FOR founder_id IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'founder'::app_role
  LOOP
    PERFORM create_notification(
      founder_id,
      'new_user',
      '🎉 New user registered: ' || new_username
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;