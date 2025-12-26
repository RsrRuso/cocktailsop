-- Create yield_recipes table for saving yield calculator recipes
CREATE TABLE IF NOT EXISTS public.yield_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'liquid', -- 'solid' or 'liquid'
  input_ingredients JSONB DEFAULT '[]'::jsonb,
  raw_weight NUMERIC,
  prepared_weight NUMERIC,
  final_yield_ml NUMERIC,
  total_cost NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'ml',
  yield_percentage NUMERIC,
  wastage NUMERIC,
  cost_per_unit NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.yield_recipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own yield recipes"
ON public.yield_recipes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own yield recipes"
ON public.yield_recipes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own yield recipes"
ON public.yield_recipes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own yield recipes"
ON public.yield_recipes
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_yield_recipes_updated_at
BEFORE UPDATE ON public.yield_recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();