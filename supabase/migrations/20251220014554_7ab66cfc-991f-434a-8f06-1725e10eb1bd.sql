-- Add is_welcome_message column to conversations for tracking welcome chats
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_welcome_message BOOLEAN DEFAULT FALSE;

-- Mark existing welcome message conversations
UPDATE public.conversations c
SET is_welcome_message = TRUE
WHERE EXISTS (
  SELECT 1 FROM public.messages m 
  WHERE m.conversation_id = c.id 
  AND m.content ILIKE '%Welcome to SV%'
  AND m.sender_id = 'b0a7ed79-d79c-41aa-b66e-a210a64d12a6'
);

-- Update send_welcome_message_to_new_user to mark conversation as welcome message
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  specverse_user_id UUID := 'b0a7ed79-d79c-41aa-b66e-a210a64d12a6';
  new_conv_id UUID;
  existing_conv_id UUID;
  participant_array UUID[];
BEGIN
  -- Skip if this is the SpecVerse account itself
  IF NEW.id = specverse_user_id THEN
    RETURN NEW;
  END IF;

  -- Create participant array (sorted for consistency)
  IF NEW.id < specverse_user_id THEN
    participant_array := ARRAY[NEW.id, specverse_user_id];
  ELSE
    participant_array := ARRAY[specverse_user_id, NEW.id];
  END IF;

  -- Check for existing conversation
  SELECT id INTO existing_conv_id
  FROM public.conversations
  WHERE participant_ids @> ARRAY[NEW.id, specverse_user_id]::UUID[]
    AND participant_ids <@ ARRAY[NEW.id, specverse_user_id]::UUID[]
  LIMIT 1;

  IF existing_conv_id IS NULL THEN
    -- Create new conversation marked as welcome message
    INSERT INTO public.conversations (participant_ids, created_by, last_message_at, is_welcome_message)
    VALUES (participant_array, specverse_user_id, NOW(), TRUE)
    RETURNING id INTO new_conv_id;
  ELSE
    new_conv_id := existing_conv_id;
    -- Mark as welcome message
    UPDATE public.conversations SET is_welcome_message = TRUE WHERE id = new_conv_id;
  END IF;

  -- Send welcome message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    read,
    delivered
  ) VALUES (
    new_conv_id,
    specverse_user_id,
    '🎉 Welcome to SV! Congratulations on joining our community! We''re excited to have you here. Feel free to explore all the amazing features and connect with others. If you need any help, don''t hesitate to reach out. Happy networking! 🚀',
    FALSE,
    TRUE
  );

  -- Update conversation timestamp
  UPDATE public.conversations 
  SET last_message_at = NOW() 
  WHERE id = new_conv_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in send_welcome_message_to_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create function to auto-archive welcome messages after 1 day
CREATE OR REPLACE FUNCTION public.archive_old_welcome_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Archive welcome message conversations older than 1 day
  -- We mark them with a special archived_at timestamp so the app knows to hide them
  UPDATE public.conversations
  SET is_welcome_message = FALSE
  WHERE is_welcome_message = TRUE
    AND created_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Create a cron-like trigger using pg_cron if available, or we'll handle it client-side
-- For now, create a simple cleanup function that runs on conversation access
CREATE OR REPLACE FUNCTION public.cleanup_welcome_messages_on_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Quick check and archive old welcome messages
  UPDATE public.conversations
  SET is_welcome_message = FALSE
  WHERE is_welcome_message = TRUE
    AND created_at < NOW() - INTERVAL '1 day';
  
  RETURN NULL;
END;
$$;

-- Run cleanup when conversations are queried (lightweight trigger on periodic operations)
DROP TRIGGER IF EXISTS trigger_cleanup_welcome_on_message ON public.messages;
CREATE TRIGGER trigger_cleanup_welcome_on_message
  AFTER INSERT ON public.messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_welcome_messages_on_access();