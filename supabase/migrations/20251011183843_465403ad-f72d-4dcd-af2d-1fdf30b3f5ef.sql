-- Create user_status table for Instagram-like status sharing
CREATE TABLE IF NOT EXISTS public.user_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_text TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Status viewable by everyone"
  ON public.user_status FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can create own status"
  ON public.user_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status"
  ON public.user_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own status"
  ON public.user_status FOR DELETE
  USING (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX idx_user_status_user_id ON public.user_status(user_id);
CREATE INDEX idx_user_status_expires_at ON public.user_status(expires_at);