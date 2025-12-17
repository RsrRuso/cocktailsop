-- Create reel_tags table for storing tagged users
CREATE TABLE public.reel_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL,
  tagged_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate tags
CREATE UNIQUE INDEX idx_reel_tags_unique ON public.reel_tags(reel_id, tagged_user_id);

-- Create indexes for performance
CREATE INDEX idx_reel_tags_reel_id ON public.reel_tags(reel_id);
CREATE INDEX idx_reel_tags_tagged_user_id ON public.reel_tags(tagged_user_id);

-- Enable RLS
ALTER TABLE public.reel_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can view reel tags
CREATE POLICY "Anyone can view reel tags"
ON public.reel_tags FOR SELECT
USING (true);

-- Reel owner can insert tags
CREATE POLICY "Reel owner can insert tags"
ON public.reel_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reels 
    WHERE id = reel_id AND user_id = auth.uid()
  )
);

-- Reel owner can delete tags
CREATE POLICY "Reel owner can delete tags"
ON public.reel_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.reels 
    WHERE id = reel_id AND user_id = auth.uid()
  )
);

-- Create function to notify tagged user and auto-save reel
CREATE OR REPLACE FUNCTION public.notify_reel_tag()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for tagged user
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.tagged_user_id,
    'reel_tag',
    'You were tagged in a reel',
    'Someone tagged you in their reel',
    jsonb_build_object('reel_id', NEW.reel_id, 'tagged_by', NEW.tagged_by_user_id)
  );
  
  -- Auto-save the reel to tagged user's saves
  INSERT INTO public.reel_saves (user_id, reel_id)
  VALUES (NEW.tagged_user_id, NEW.reel_id)
  ON CONFLICT (user_id, reel_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for notifications
CREATE TRIGGER on_reel_tag_created
AFTER INSERT ON public.reel_tags
FOR EACH ROW
EXECUTE FUNCTION public.notify_reel_tag();