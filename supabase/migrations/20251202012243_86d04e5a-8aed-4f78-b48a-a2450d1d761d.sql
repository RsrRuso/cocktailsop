-- Create database triggers to fire automations on real events

-- Function to trigger automation webhooks
CREATE OR REPLACE FUNCTION public.fire_automation_trigger(p_trigger_type TEXT, p_user_id UUID, p_payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trigger_record RECORD;
BEGIN
  -- Find all active triggers for this event type and user
  FOR trigger_record IN 
    SELECT t.id, t.webhook_id, t.config, w.webhook_url
    FROM automation_triggers t
    JOIN automation_webhooks w ON w.id = t.webhook_id
    WHERE t.user_id = p_user_id
      AND t.trigger_type = p_trigger_type
      AND t.is_active = true
      AND w.is_active = true
  LOOP
    -- Log that we're attempting to fire
    INSERT INTO automation_logs (
      user_id,
      trigger_id,
      webhook_id,
      status,
      payload
    ) VALUES (
      p_user_id,
      trigger_record.id,
      trigger_record.webhook_id,
      'pending',
      jsonb_build_object(
        'trigger_type', p_trigger_type,
        'data', p_payload,
        'timestamp', now()
      )
    );
    
    -- Note: Actual webhook firing happens via the trigger-automation edge function
    -- The client app should listen for these logs and fire the edge function
  END LOOP;
END;
$$;

-- Trigger automation on new post
CREATE OR REPLACE FUNCTION public.automation_on_new_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fire_automation_trigger(
    'new_post',
    NEW.user_id,
    jsonb_build_object(
      'post_id', NEW.id,
      'content', NEW.content,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_automation_new_post
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_new_post();

-- Trigger automation on new follower
CREATE OR REPLACE FUNCTION public.automation_on_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fire_automation_trigger(
    'new_follower',
    NEW.following_id,
    jsonb_build_object(
      'follower_id', NEW.follower_id,
      'following_id', NEW.following_id,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_automation_new_follower
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_new_follower();

-- Trigger automation on new message
CREATE OR REPLACE FUNCTION public.automation_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire for the recipient (get recipient from conversation)
  PERFORM fire_automation_trigger(
    'new_message',
    (SELECT unnest(participant_ids) FROM conversations WHERE id = NEW.conversation_id AND unnest != NEW.sender_id LIMIT 1),
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'content', NEW.content,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_automation_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_new_message();

-- Trigger automation on new event
CREATE OR REPLACE FUNCTION public.automation_on_new_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fire_automation_trigger(
    'new_event',
    NEW.user_id,
    jsonb_build_object(
      'event_id', NEW.id,
      'title', NEW.title,
      'event_date', NEW.event_date,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_automation_new_event
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_new_event();

-- Trigger automation on new music share
CREATE OR REPLACE FUNCTION public.automation_on_new_music_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fire_automation_trigger(
    'new_music_share',
    NEW.user_id,
    jsonb_build_object(
      'music_share_id', NEW.id,
      'track_title', NEW.track_title,
      'track_artist', NEW.track_artist,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_automation_new_music_share
  AFTER INSERT ON music_shares
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_new_music_share();