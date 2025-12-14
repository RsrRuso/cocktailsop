-- ==================================================
-- AI MATRIX: Voice-Activated Inventory & Document Intelligence
-- ==================================================

-- 1. Matrix Audit Logs - Track all Matrix interactions
CREATE TABLE IF NOT EXISTS public.matrix_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  intent TEXT,
  entities JSONB,
  raw_transcript TEXT,
  response_summary TEXT,
  response_time_ms INTEGER,
  device TEXT,
  wake_phrase TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matrix_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own matrix logs"
  ON public.matrix_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matrix logs"
  ON public.matrix_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Item Aliases for fuzzy matching
CREATE TABLE IF NOT EXISTS public.item_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  alias TEXT NOT NULL,
  category TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.item_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view item aliases"
  ON public.item_aliases FOR SELECT
  USING (is_global = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own aliases"
  ON public.item_aliases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own aliases"
  ON public.item_aliases FOR DELETE
  USING (auth.uid() = user_id);

-- 3. PDF Documents Storage
CREATE TABLE IF NOT EXISTS public.matrix_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT DEFAULT 'pdf',
  document_type TEXT,
  extracted_text TEXT,
  metadata JSONB,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matrix_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON public.matrix_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.matrix_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.matrix_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.matrix_documents FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Document Chunks for keyword search (simpler than vector for now)
CREATE TABLE IF NOT EXISTS public.matrix_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.matrix_documents(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  keywords TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matrix_document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document chunks"
  ON public.matrix_document_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matrix_documents d 
      WHERE d.id = matrix_document_chunks.document_id 
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own document chunks"
  ON public.matrix_document_chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matrix_documents d 
      WHERE d.id = matrix_document_chunks.document_id 
      AND d.user_id = auth.uid()
    )
  );

-- 5. Matrix Wake Phrase History
CREATE TABLE IF NOT EXISTS public.matrix_wake_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phrase_text TEXT NOT NULL,
  recognized BOOLEAN DEFAULT true,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matrix_wake_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wake phrases"
  ON public.matrix_wake_phrases FOR ALL
  USING (auth.uid() = user_id);

-- 6. Matrix User Preferences
CREATE TABLE IF NOT EXISTS public.matrix_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tone_mode TEXT DEFAULT 'professional',
  voice_speed NUMERIC(3,2) DEFAULT 1.0,
  voice_pitch NUMERIC(3,2) DEFAULT 1.0,
  wake_phrase_enabled BOOLEAN DEFAULT true,
  custom_wake_phrases TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matrix_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.matrix_user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- 7. Insert default glassware aliases
INSERT INTO public.item_aliases (item_name, alias, category, is_global) VALUES
  ('Nick and Nora', 'nick nora', 'glassware', true),
  ('Nick and Nora', 'n and n', 'glassware', true),
  ('Coupe', 'coupe glass', 'glassware', true),
  ('Martini', 'martini glass', 'glassware', true),
  ('Highball', 'hi ball', 'glassware', true),
  ('Rocks', 'old fashioned glass', 'glassware', true),
  ('Collins', 'collins glass', 'glassware', true),
  ('Flute', 'champagne flute', 'glassware', true),
  ('Wine', 'wine glass', 'glassware', true),
  ('Shot', 'shot glass', 'glassware', true),
  ('Copper Mug', 'moscow mule mug', 'glassware', true)
ON CONFLICT DO NOTHING;

-- 8. Create keyword search function for documents
CREATE OR REPLACE FUNCTION public.search_matrix_documents(
  p_user_id UUID,
  p_keywords TEXT[]
)
RETURNS TABLE (
  document_id UUID,
  chunk_id UUID,
  chunk_text TEXT,
  filename TEXT,
  document_type TEXT,
  relevance_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as document_id,
    c.id as chunk_id,
    c.chunk_text,
    d.filename,
    d.document_type,
    (
      SELECT COUNT(*)::INTEGER 
      FROM unnest(p_keywords) k 
      WHERE c.chunk_text ILIKE '%' || k || '%'
    ) as relevance_score
  FROM matrix_document_chunks c
  INNER JOIN matrix_documents d ON d.id = c.document_id
  WHERE d.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM unnest(p_keywords) k 
      WHERE c.chunk_text ILIKE '%' || k || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT 10;
END;
$$;