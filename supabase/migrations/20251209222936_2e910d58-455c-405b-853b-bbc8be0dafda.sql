-- Create post_reposts table
CREATE TABLE public.post_reposts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create reel_reposts table
CREATE TABLE public.reel_reposts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Create post_saves table (bookmarks)
CREATE TABLE public.post_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create reel_saves table (bookmarks)
CREATE TABLE public.reel_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Add repost_count and save_count to posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- Add repost_count and save_count to reels
ALTER TABLE public.reels 
ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_saves ENABLE ROW LEVEL SECURITY;

-- RLS for post_reposts
CREATE POLICY "Anyone can view reposts" ON public.post_reposts FOR SELECT USING (true);
CREATE POLICY "Users can create reposts" ON public.post_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reposts" ON public.post_reposts FOR DELETE USING (auth.uid() = user_id);

-- RLS for reel_reposts
CREATE POLICY "Anyone can view reel reposts" ON public.reel_reposts FOR SELECT USING (true);
CREATE POLICY "Users can create reel reposts" ON public.reel_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reel reposts" ON public.reel_reposts FOR DELETE USING (auth.uid() = user_id);

-- RLS for post_saves
CREATE POLICY "Anyone can view post saves" ON public.post_saves FOR SELECT USING (true);
CREATE POLICY "Users can save posts" ON public.post_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts" ON public.post_saves FOR DELETE USING (auth.uid() = user_id);

-- RLS for reel_saves
CREATE POLICY "Anyone can view reel saves" ON public.reel_saves FOR SELECT USING (true);
CREATE POLICY "Users can save reels" ON public.reel_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave reels" ON public.reel_saves FOR DELETE USING (auth.uid() = user_id);

-- Trigger functions for repost count
CREATE OR REPLACE FUNCTION update_post_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_reel_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET repost_count = repost_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger functions for save count
CREATE OR REPLACE FUNCTION update_post_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_reel_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET save_count = save_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER post_repost_count_trigger
AFTER INSERT OR DELETE ON public.post_reposts
FOR EACH ROW EXECUTE FUNCTION update_post_repost_count();

CREATE TRIGGER reel_repost_count_trigger
AFTER INSERT OR DELETE ON public.reel_reposts
FOR EACH ROW EXECUTE FUNCTION update_reel_repost_count();

CREATE TRIGGER post_save_count_trigger
AFTER INSERT OR DELETE ON public.post_saves
FOR EACH ROW EXECUTE FUNCTION update_post_save_count();

CREATE TRIGGER reel_save_count_trigger
AFTER INSERT OR DELETE ON public.reel_saves
FOR EACH ROW EXECUTE FUNCTION update_reel_save_count();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reposts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_reposts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_saves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_saves;