-- Fix the reel tag notification function to use correct columns
CREATE OR REPLACE FUNCTION public.notify_reel_tag()
RETURNS TRIGGER AS $$
DECLARE
  tagger_username TEXT;
BEGIN
  -- Get tagger username
  SELECT username INTO tagger_username FROM public.profiles WHERE id = NEW.tagged_by_user_id;
  
  -- Insert notification for tagged user with correct columns
  INSERT INTO public.notifications (user_id, type, content, reel_id, reference_user_id)
  VALUES (
    NEW.tagged_user_id,
    'reel_tag',
    COALESCE(tagger_username, 'Someone') || ' tagged you in a reel',
    NEW.reel_id,
    NEW.tagged_by_user_id
  );
  
  -- Auto-save the reel to tagged user's saves
  INSERT INTO public.reel_saves (user_id, reel_id)
  VALUES (NEW.tagged_user_id, NEW.reel_id)
  ON CONFLICT (user_id, reel_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;