-- Function to send welcome message to new users
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  system_user_id UUID;
  welcome_conversation_id UUID;
  participant_ids_array UUID[];
BEGIN
  -- Use a known system user ID or create a special "SV Welcome" user
  -- For now, we'll use the first admin/founder user as the sender
  -- You can change this to a dedicated system user ID
  SELECT user_id INTO system_user_id
  FROM user_roles
  WHERE role = 'founder'
  LIMIT 1;
  
  -- If no founder exists, use the new user's own ID (self-message)
  IF system_user_id IS NULL THEN
    system_user_id := NEW.id;
  END IF;
  
  -- Create participant array
  participant_ids_array := ARRAY[system_user_id, NEW.id];
  
  -- Check if conversation already exists
  SELECT id INTO welcome_conversation_id
  FROM conversations
  WHERE participant_ids @> ARRAY[NEW.id]
    AND participant_ids @> ARRAY[system_user_id]
    AND array_length(participant_ids, 1) = 2
    AND is_group = false
  LIMIT 1;
  
  -- Create conversation if it doesn't exist
  IF welcome_conversation_id IS NULL THEN
    INSERT INTO conversations (
      participant_ids,
      is_group,
      created_by,
      last_message_at
    ) VALUES (
      participant_ids_array,
      false,
      system_user_id,
      NOW()
    )
    RETURNING id INTO welcome_conversation_id;
  END IF;
  
  -- Send welcome message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    delivered,
    read
  ) VALUES (
    welcome_conversation_id,
    system_user_id,
    '🎉 Welcome to SV! Congratulations on joining our community! We''re excited to have you here. Feel free to explore all the amazing features and connect with others. If you need any help, don''t hesitate to reach out. Happy networking! 🚀',
    true,
    false
  );
  
  -- Update conversation timestamp
  UPDATE conversations
  SET last_message_at = NOW()
  WHERE id = welcome_conversation_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to send welcome message on new user profile creation
DROP TRIGGER IF EXISTS trigger_send_welcome_message ON public.profiles;
CREATE TRIGGER trigger_send_welcome_message
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message_to_new_user();