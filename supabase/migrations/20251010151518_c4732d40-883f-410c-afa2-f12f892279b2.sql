-- Fix Critical Security Issues

-- 1. DROP the insecure profiles_public view
-- This view bypasses RLS and exposes data without proper access control
DROP VIEW IF EXISTS public.profiles_public;

-- 2. Fix has_role() function to prevent search_path attacks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Fix all notification trigger functions to use empty search_path
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (p_user_id, p_type, p_content);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  post_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  SELECT username INTO liker_username FROM public.profiles WHERE id = NEW.user_id;
  
  IF post_owner_id != NEW.user_id THEN
    PERFORM public.create_notification(
      post_owner_id,
      'like',
      liker_username || ' liked your post'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  post_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  
  IF post_owner_id != NEW.user_id THEN
    PERFORM public.create_notification(
      post_owner_id,
      'comment',
      commenter_username || ' commented on your post'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  follower_username TEXT;
BEGIN
  SELECT username INTO follower_username FROM public.profiles WHERE id = NEW.follower_id;
  
  PERFORM public.create_notification(
    NEW.following_id,
    'follow',
    follower_username || ' started following you'
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_venue_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  venue_name TEXT;
  user_name TEXT;
BEGIN
  SELECT name INTO venue_name FROM public.venues WHERE id = NEW.venue_id;
  SELECT username INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  PERFORM public.create_notification(
    NEW.user_id,
    'verification_pending',
    'Verification request sent to ' || venue_name
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_profile_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  viewer_username TEXT;
BEGIN
  IF NEW.viewer_id != NEW.viewed_profile_id THEN
    SELECT username INTO viewer_username FROM public.profiles WHERE id = NEW.viewer_id;
    
    INSERT INTO public.notifications (user_id, type, content)
    VALUES (
      NEW.viewed_profile_id,
      'profile_view',
      viewer_username || ' viewed your profile'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_story_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  story_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM public.stories WHERE id = NEW.story_id;
  SELECT username INTO liker_username FROM public.profiles WHERE id = NEW.user_id;
  
  IF story_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, content)
    VALUES (
      story_owner_id,
      'like',
      liker_username || ' liked your story'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_story_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  story_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO story_owner_id FROM public.stories WHERE id = NEW.story_id;
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  
  IF story_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, content)
    VALUES (
      story_owner_id,
      'comment',
      commenter_username || ' commented on your story'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_reel_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  reel_owner_id UUID;
  liker_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  SELECT username INTO liker_username FROM public.profiles WHERE id = NEW.user_id;
  
  IF reel_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, content)
    VALUES (
      reel_owner_id,
      'like',
      liker_username || ' liked your reel'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  reel_owner_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  
  IF reel_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, content)
    VALUES (
      reel_owner_id,
      'comment',
      commenter_username || ' commented on your reel'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  sender_username TEXT;
  recipient_id UUID;
  participant UUID;
BEGIN
  SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.sender_id;
  
  FOREACH participant IN ARRAY (
    SELECT participant_ids FROM public.conversations WHERE id = NEW.conversation_id
  )
  LOOP
    IF participant != NEW.sender_id THEN
      recipient_id := participant;
      EXIT;
    END IF;
  END LOOP;
  
  IF recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, content)
    VALUES (
      recipient_id,
      'message',
      sender_username || ' sent you a message'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Configure storage buckets with size and MIME restrictions
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE name = 'avatars';

UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE name = 'covers';

UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
WHERE name = 'stories';

UPDATE storage.buckets
SET
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE name = 'posts';

UPDATE storage.buckets
SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime']
WHERE name = 'reels';