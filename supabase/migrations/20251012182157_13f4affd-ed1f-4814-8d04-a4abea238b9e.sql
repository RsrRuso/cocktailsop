-- Notification function for music share likes
CREATE OR REPLACE FUNCTION public.notify_music_share_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  music_share_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO music_share_owner_id FROM music_shares WHERE id = NEW.music_share_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  IF music_share_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      music_share_owner_id,
      'like',
      liker_username || ' liked your music share',
      NULL, NULL, NULL, NEW.music_share_id, NULL, NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Notification function for music share comments
CREATE OR REPLACE FUNCTION public.notify_music_share_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  music_share_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO music_share_owner_id FROM music_shares WHERE id = NEW.music_share_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  IF music_share_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      music_share_owner_id,
      'comment',
      commenter_username || ' commented on your music share',
      NULL, NULL, NULL, NEW.music_share_id, NULL, NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Notification function for event likes
CREATE OR REPLACE FUNCTION public.notify_event_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO event_owner_id FROM events WHERE id = NEW.event_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  IF event_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      event_owner_id,
      'like',
      liker_username || ' liked your event',
      NULL, NULL, NULL, NULL, NEW.event_id, NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Notification function for event comments
CREATE OR REPLACE FUNCTION public.notify_event_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO event_owner_id FROM events WHERE id = NEW.event_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  IF event_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      event_owner_id,
      'comment',
      commenter_username || ' commented on your event',
      NULL, NULL, NULL, NULL, NEW.event_id, NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Notification function for event attendance
CREATE OR REPLACE FUNCTION public.notify_event_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_owner_id UUID;
  attendee_username TEXT;
BEGIN
  SELECT user_id INTO event_owner_id FROM events WHERE id = NEW.event_id;
  SELECT username INTO attendee_username FROM profiles WHERE id = NEW.user_id;
  
  IF event_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      event_owner_id,
      'event_attendance',
      attendee_username || ' is attending your event',
      NULL, NULL, NULL, NULL, NEW.event_id, NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create triggers for all these notifications
CREATE TRIGGER on_music_share_like
  AFTER INSERT ON public.music_share_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_music_share_like();

CREATE TRIGGER on_music_share_comment
  AFTER INSERT ON public.music_share_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_music_share_comment();

CREATE TRIGGER on_event_like
  AFTER INSERT ON public.event_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_like();

CREATE TRIGGER on_event_comment
  AFTER INSERT ON public.event_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_comment();

CREATE TRIGGER on_event_attendance
  AFTER INSERT ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_attendance();