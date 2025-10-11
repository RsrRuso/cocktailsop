-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- Create user_status table
CREATE TABLE IF NOT EXISTS public.user_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_text TEXT,
  music_url TEXT,
  music_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all active status"
  ON public.user_status FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can insert own status"
  ON public.user_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status"
  ON public.user_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own status"
  ON public.user_status FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for music bucket
CREATE POLICY "Music files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'music');

CREATE POLICY "Users can upload their own music"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'music' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own music"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'music' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own music"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'music' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable realtime for user_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;