-- Create reel_likes table
CREATE TABLE public.reel_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, reel_id)
);

-- Enable RLS on reel_likes
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_likes
CREATE POLICY "Likes are viewable by everyone" ON public.reel_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like reels" ON public.reel_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reels" ON public.reel_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Create reel_comments table
CREATE TABLE public.reel_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on reel_comments
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_comments
CREATE POLICY "Comments are viewable by everyone" ON public.reel_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.reel_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.reel_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.reel_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Add UPDATE policy for reels (needed for edit functionality)
CREATE POLICY "Users can update own reels" ON public.reels
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger function for reel like count
CREATE OR REPLACE FUNCTION public.update_reel_like_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels 
    SET like_count = like_count + 1 
    WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels 
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for reel likes
CREATE TRIGGER update_reel_like_count_trigger
  AFTER INSERT OR DELETE ON public.reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reel_like_count();

-- Create trigger function for reel comment count
CREATE OR REPLACE FUNCTION public.update_reel_comment_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for reel comments
CREATE TRIGGER update_reel_comment_count_trigger
  AFTER INSERT OR DELETE ON public.reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reel_comment_count();