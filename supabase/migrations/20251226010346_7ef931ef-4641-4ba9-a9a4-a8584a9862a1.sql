-- Create sub_recipes table for pre-made mixes that can be used as ingredients
CREATE TABLE public.sub_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  total_yield_ml NUMERIC NOT NULL DEFAULT 1000,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.mixologist_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_recipes ENABLE ROW LEVEL SECURITY;

-- Policies for user access
CREATE POLICY "Users can view their own sub-recipes" 
ON public.sub_recipes 
FOR SELECT 
USING (auth.uid() = user_id OR group_id IN (
  SELECT group_id FROM public.mixologist_group_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create their own sub-recipes" 
ON public.sub_recipes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub-recipes" 
ON public.sub_recipes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub-recipes" 
ON public.sub_recipes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add source_type and source_id columns to master_spirits to track origin
ALTER TABLE public.master_spirits 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_id UUID;

-- Add yield_percentage column to master_spirits for yield-calculated items
ALTER TABLE public.master_spirits 
ADD COLUMN IF NOT EXISTS yield_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'ml';

-- Create trigger for automatic timestamp updates on sub_recipes
CREATE TRIGGER update_sub_recipes_updated_at
BEFORE UPDATE ON public.sub_recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();