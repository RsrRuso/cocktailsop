-- Create table to store user Spotify tokens
CREATE TABLE public.spotify_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  scope text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own Spotify connection
CREATE POLICY "Users can view own Spotify connection"
  ON public.spotify_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own Spotify connection
CREATE POLICY "Users can insert own Spotify connection"
  ON public.spotify_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own Spotify connection
CREATE POLICY "Users can update own Spotify connection"
  ON public.spotify_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own Spotify connection
CREATE POLICY "Users can delete own Spotify connection"
  ON public.spotify_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_spotify_connections_updated_at
  BEFORE UPDATE ON public.spotify_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();