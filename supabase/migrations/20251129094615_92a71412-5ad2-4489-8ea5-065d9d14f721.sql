-- Create master spirits list table
CREATE TABLE IF NOT EXISTS public.master_spirits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  bottle_size_ml INTEGER NOT NULL DEFAULT 750,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.master_spirits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own master spirits"
ON public.master_spirits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own master spirits"
ON public.master_spirits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own master spirits"
ON public.master_spirits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own master spirits"
ON public.master_spirits
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_master_spirits_updated_at
BEFORE UPDATE ON public.master_spirits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();