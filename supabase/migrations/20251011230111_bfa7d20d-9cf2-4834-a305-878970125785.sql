-- Create music_shares table
CREATE TABLE public.music_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.music_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for music_shares
CREATE POLICY "Music shares are viewable by everyone" 
ON public.music_shares 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own music shares" 
ON public.music_shares 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own music shares" 
ON public.music_shares 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_music_shares_created_at ON public.music_shares(created_at DESC);
CREATE INDEX idx_music_shares_user_id ON public.music_shares(user_id);

-- Enable realtime for music_shares
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_shares;