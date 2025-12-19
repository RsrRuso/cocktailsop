-- Create a table to store hidden spaces for users
CREATE TABLE public.hidden_user_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  space_id UUID NOT NULL,
  space_type TEXT NOT NULL,
  hidden_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, space_id, space_type)
);

-- Enable RLS
ALTER TABLE public.hidden_user_spaces ENABLE ROW LEVEL SECURITY;

-- Users can only see their own hidden spaces
CREATE POLICY "Users can view their own hidden spaces"
  ON public.hidden_user_spaces
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can hide their own spaces
CREATE POLICY "Users can hide their own spaces"
  ON public.hidden_user_spaces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can restore (delete) their own hidden spaces
CREATE POLICY "Users can restore their own spaces"
  ON public.hidden_user_spaces
  FOR DELETE
  USING (auth.uid() = user_id);