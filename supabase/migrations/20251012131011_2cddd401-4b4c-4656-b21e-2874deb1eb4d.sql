-- Create competitions table for tracking user competitions
CREATE TABLE public.competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  organizer TEXT,
  competition_date DATE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('participated', 'won')),
  description TEXT,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view own competitions" 
ON public.competitions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitions" 
ON public.competitions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitions" 
ON public.competitions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitions" 
ON public.competitions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_competitions_updated_at
BEFORE UPDATE ON public.competitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();