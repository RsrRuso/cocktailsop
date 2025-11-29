-- Create master_spirits table for storing ingredient master list
CREATE TABLE IF NOT EXISTS public.master_spirits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  bottle_size_ml INTEGER NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.master_spirits ENABLE ROW LEVEL SECURITY;

-- Users can view all master spirits
CREATE POLICY "Users can view all master spirits"
  ON public.master_spirits
  FOR SELECT
  USING (true);

-- Users can insert their own master spirits
CREATE POLICY "Users can create master spirits"
  ON public.master_spirits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own master spirits
CREATE POLICY "Users can update own master spirits"
  ON public.master_spirits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own master spirits
CREATE POLICY "Users can delete own master spirits"
  ON public.master_spirits
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_master_spirits_user_id ON public.master_spirits(user_id);
CREATE INDEX IF NOT EXISTS idx_master_spirits_name ON public.master_spirits(name);