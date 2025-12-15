-- Fix duplicate triggers and add proper exception handling for notifications

-- 1. Drop the duplicate trigger
DROP TRIGGER IF EXISTS on_new_user ON profiles;

-- 2. Update create_notification to handle duplicates gracefully
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_content TEXT,
  p_post_id UUID DEFAULT NULL,
  p_reel_id UUID DEFAULT NULL,
  p_story_id UUID DEFAULT NULL,
  p_music_share_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_reference_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, content,
    post_id, reel_id, story_id, music_share_id, event_id, reference_user_id
  )
  VALUES (
    p_user_id, p_type, p_content,
    p_post_id, p_reel_id, p_story_id, p_music_share_id, p_event_id, p_reference_user_id
  )
  ON CONFLICT DO NOTHING;
EXCEPTION
  WHEN unique_violation THEN
    -- Silently ignore duplicate notifications
    NULL;
END;
$$;

-- 3. Update notify_founders_new_user to handle exceptions
CREATE OR REPLACE FUNCTION public.notify_founders_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  founder_id UUID;
  new_username TEXT;
BEGIN
  -- Get the new user's username
  new_username := COALESCE(NEW.username, 'A new user');
  
  -- Notify all founders
  FOR founder_id IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'founder'::app_role
  LOOP
    BEGIN
      PERFORM create_notification(
        founder_id,
        'new_user',
        '🎉 New user registered: ' || new_username
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log but don't fail registration
        NULL;
    END;
  END LOOP;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail user registration due to notification issues
    RETURN NEW;
END;
$$;

-- 4. Update send_welcome_message_to_new_user to handle exceptions
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  system_user_id UUID;
  welcome_conversation_id UUID;
  participant_ids_array UUID[];
BEGIN
  -- Use the first founder as the sender
  SELECT user_id INTO system_user_id
  FROM user_roles
  WHERE role = 'founder'
  LIMIT 1;
  
  -- If no founder exists, skip welcome message
  IF system_user_id IS NULL THEN
    RETURN NEW;
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
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail user registration due to welcome message issues
    RETURN NEW;
END;
$$;