-- Create yield depletions table to track usage of yield products (like infusions)
CREATE TABLE public.yield_depletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_spirit_id UUID REFERENCES public.master_spirits(id) ON DELETE CASCADE,
  production_id UUID REFERENCES public.batch_productions(id) ON DELETE SET NULL,
  amount_used_ml NUMERIC NOT NULL DEFAULT 0,
  ingredient_breakdown JSONB DEFAULT '[]',
  depleted_by_user_id UUID,
  depleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  user_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.yield_depletions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own yield depletions" 
ON public.yield_depletions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create yield depletions" 
ON public.yield_depletions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own yield depletions" 
ON public.yield_depletions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own yield depletions" 
ON public.yield_depletions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_yield_depletions_spirit ON public.yield_depletions(master_spirit_id);
CREATE INDEX idx_yield_depletions_production ON public.yield_depletions(production_id);