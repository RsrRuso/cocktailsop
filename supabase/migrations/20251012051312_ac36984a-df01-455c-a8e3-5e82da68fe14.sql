-- Create certifications table for diplomas and certificates
CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('diploma', 'certificate')),
  title TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recognitions table for network recognitions
CREATE TABLE public.recognitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE NOT NULL,
  description TEXT,
  recognition_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on certifications
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certifications
CREATE POLICY "Users can view own certifications"
  ON public.certifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certifications"
  ON public.certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own certifications"
  ON public.certifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own certifications"
  ON public.certifications FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on recognitions
ALTER TABLE public.recognitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recognitions
CREATE POLICY "Users can view own recognitions"
  ON public.recognitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recognitions"
  ON public.recognitions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recognitions"
  ON public.recognitions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recognitions"
  ON public.recognitions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_certifications_user_id ON public.certifications(user_id);
CREATE INDEX idx_recognitions_user_id ON public.recognitions(user_id);

-- Add updated_at trigger for certifications
CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for recognitions
CREATE TRIGGER update_recognitions_updated_at
  BEFORE UPDATE ON public.recognitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();