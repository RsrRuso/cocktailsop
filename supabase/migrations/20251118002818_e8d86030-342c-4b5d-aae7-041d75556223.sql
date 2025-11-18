-- Create table for detailed cocktail SOPs
CREATE TABLE IF NOT EXISTS public.cocktail_sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Identity/Metrics
  drink_name TEXT NOT NULL,
  technique TEXT NOT NULL,
  glass TEXT NOT NULL,
  ice TEXT NOT NULL,
  garnish TEXT NOT NULL,
  main_image TEXT,
  total_ml INTEGER NOT NULL,
  abv_percentage DECIMAL(5,2),
  ratio TEXT,
  ph DECIMAL(4,2),
  brix DECIMAL(5,2),
  kcal INTEGER,
  
  -- Method & Notes
  method_sop TEXT NOT NULL,
  service_notes TEXT,
  
  -- Taste profile (0-10 scale)
  taste_sweet INTEGER DEFAULT 0,
  taste_sour INTEGER DEFAULT 0,
  taste_salty INTEGER DEFAULT 0,
  taste_umami INTEGER DEFAULT 0,
  taste_bitter INTEGER DEFAULT 0,
  
  -- Recipe (stored as JSONB array)
  -- Each ingredient: {ingredient, amount, unit, type, abv, notes, descriptors, allergens}
  recipe JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cocktail_sops ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own cocktail SOPs" 
ON public.cocktail_sops 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cocktail SOPs" 
ON public.cocktail_sops 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cocktail SOPs" 
ON public.cocktail_sops 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cocktail SOPs" 
ON public.cocktail_sops 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cocktail_sops_updated_at
BEFORE UPDATE ON public.cocktail_sops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();