-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.update_livestream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.livestreams 
    SET viewer_count = viewer_count + 1,
        peak_viewers = GREATEST(peak_viewers, viewer_count + 1)
    WHERE id = NEW.livestream_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    UPDATE public.livestreams 
    SET viewer_count = GREATEST(0, viewer_count - 1)
    WHERE id = NEW.livestream_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;