-- Add reaction and reply counts to user_status table
ALTER TABLE public.user_status 
ADD COLUMN IF NOT EXISTS reaction_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;

-- Create status_reactions table
CREATE TABLE IF NOT EXISTS public.status_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.user_status(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(status_id, user_id, emoji)
);

-- Create status_replies table
CREATE TABLE IF NOT EXISTS public.status_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.user_status(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.status_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status_reactions
CREATE POLICY "Status reactions viewable by everyone"
  ON public.status_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.status_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.status_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for status_replies
CREATE POLICY "Status replies viewable by everyone"
  ON public.status_replies FOR SELECT
  USING (true);

CREATE POLICY "Users can add replies"
  ON public.status_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON public.status_replies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON public.status_replies FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update status reaction count
CREATE OR REPLACE FUNCTION public.update_status_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_status 
    SET reaction_count = reaction_count + 1 
    WHERE id = NEW.status_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_status 
    SET reaction_count = GREATEST(reaction_count - 1, 0)
    WHERE id = OLD.status_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update status reply count
CREATE OR REPLACE FUNCTION public.update_status_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_status 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.status_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_status 
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.status_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Triggers for status_reactions
CREATE TRIGGER update_status_reaction_count_trigger
  AFTER INSERT OR DELETE ON public.status_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_status_reaction_count();

-- Triggers for status_replies
CREATE TRIGGER update_status_reply_count_trigger
  AFTER INSERT OR DELETE ON public.status_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_status_reply_count();