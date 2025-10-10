-- Add notification triggers for reel engagement

-- Function to notify reel likes
CREATE OR REPLACE FUNCTION public.notify_reel_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reel_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  IF reel_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content)
    VALUES (
      reel_owner_id,
      'like',
      liker_username || ' liked your reel'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function to notify reel comments
CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reel_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  IF reel_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content)
    VALUES (
      reel_owner_id,
      'comment',
      commenter_username || ' commented on your reel'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function to notify story likes
CREATE OR REPLACE FUNCTION public.notify_story_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  story_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM stories WHERE id = NEW.story_id;
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  IF story_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content)
    VALUES (
      story_owner_id,
      'like',
      liker_username || ' liked your story'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function to notify story comments
CREATE OR REPLACE FUNCTION public.notify_story_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  story_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM stories WHERE id = NEW.story_id;
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  
  IF story_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, content)
    VALUES (
      story_owner_id,
      'comment',
      commenter_username || ' commented on your story'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function to notify new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_username TEXT;
  recipient_id UUID;
BEGIN
  SELECT username INTO sender_username FROM profiles WHERE id = NEW.sender_id;
  
  -- Get the other participant in the conversation
  SELECT unnest(participant_ids) INTO recipient_id
  FROM conversations
  WHERE id = NEW.conversation_id
  AND unnest(participant_ids) != NEW.sender_id
  LIMIT 1;
  
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

-- Create triggers for reel likes
DROP TRIGGER IF EXISTS trigger_notify_reel_like ON reel_likes;
CREATE TRIGGER trigger_notify_reel_like
  AFTER INSERT ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_reel_like();

-- Create triggers for reel comments
DROP TRIGGER IF EXISTS trigger_notify_reel_comment ON reel_comments;
CREATE TRIGGER trigger_notify_reel_comment
  AFTER INSERT ON reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_reel_comment();

-- Create triggers for story likes
DROP TRIGGER IF EXISTS trigger_notify_story_like ON story_likes;
CREATE TRIGGER trigger_notify_story_like
  AFTER INSERT ON story_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_story_like();

-- Create triggers for story comments
DROP TRIGGER IF EXISTS trigger_notify_story_comment ON story_comments;
CREATE TRIGGER trigger_notify_story_comment
  AFTER INSERT ON story_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_story_comment();

-- Create triggers for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Create profile_views table for tracking profile visits
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID NOT NULL,
  viewed_profile_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_views
CREATE POLICY "Users can view their own profile views"
  ON public.profile_views
  FOR SELECT
  USING (auth.uid() = viewed_profile_id);

CREATE POLICY "Users can insert profile views"
  ON public.profile_views
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Function to notify profile views
CREATE OR REPLACE FUNCTION public.notify_profile_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  viewer_username TEXT;
BEGIN
  IF NEW.viewer_id != NEW.viewed_profile_id THEN
    SELECT username INTO viewer_username FROM profiles WHERE id = NEW.viewer_id;
    
    INSERT INTO notifications (user_id, type, content)
    VALUES (
      NEW.viewed_profile_id,
      'profile_view',
      viewer_username || ' viewed your profile'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for profile views
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON profile_views;
CREATE TRIGGER trigger_notify_profile_view
  AFTER INSERT ON profile_views
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_view();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON profile_views(viewed_at DESC);