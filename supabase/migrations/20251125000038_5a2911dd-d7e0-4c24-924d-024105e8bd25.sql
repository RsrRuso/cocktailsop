-- MATRIX AI System Tables

-- 1. Insights Collection Table
CREATE TABLE IF NOT EXISTS public.matrix_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('idea', 'feedback', 'bug', 'feature_request', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'archived')),
  priority_score INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  embedding_vector JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Pattern Detection Table
CREATE TABLE IF NOT EXISTS public.matrix_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  related_insight_ids UUID[] NOT NULL DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 1,
  trend_direction TEXT CHECK (trend_direction IN ('rising', 'stable', 'declining')),
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  category TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived'))
);

-- 3. AI Roadmap Table
CREATE TABLE IF NOT EXISTS public.matrix_roadmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_title TEXT NOT NULL,
  feature_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  priority_score INTEGER DEFAULT 0,
  estimated_impact TEXT CHECK (estimated_impact IN ('low', 'medium', 'high', 'transformative')),
  source_pattern_ids UUID[] DEFAULT '{}',
  source_insight_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'rejected')),
  reasoning TEXT,
  implementation_complexity TEXT CHECK (implementation_complexity IN ('trivial', 'simple', 'moderate', 'complex', 'epic')),
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. MATRIX Memory Engine Table
CREATE TABLE IF NOT EXISTS public.matrix_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type TEXT NOT NULL CHECK (memory_type IN ('insight', 'pattern', 'decision', 'learning', 'context')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding_vector JSONB,
  relevance_score NUMERIC(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 5. MATRIX Chat History Table
CREATE TABLE IF NOT EXISTS public.matrix_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,
  context_insights UUID[] DEFAULT '{}',
  context_memory UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.matrix_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matrix_insights
CREATE POLICY "Users can insert own insights"
  ON public.matrix_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all insights"
  ON public.matrix_insights FOR SELECT
  USING (true);

CREATE POLICY "Users can update own insights"
  ON public.matrix_insights FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for matrix_patterns (read-only for regular users)
CREATE POLICY "Everyone can view patterns"
  ON public.matrix_patterns FOR SELECT
  USING (true);

-- RLS Policies for matrix_roadmap (read-only for regular users)
CREATE POLICY "Everyone can view roadmap"
  ON public.matrix_roadmap FOR SELECT
  USING (true);

-- RLS Policies for matrix_memory (read-only for regular users)
CREATE POLICY "Everyone can view memory"
  ON public.matrix_memory FOR SELECT
  USING (true);

-- RLS Policies for matrix_chat_history
CREATE POLICY "Users can insert own chat messages"
  ON public.matrix_chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own chat history"
  ON public.matrix_chat_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matrix_insights_user_id ON public.matrix_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_matrix_insights_status ON public.matrix_insights(status);
CREATE INDEX IF NOT EXISTS idx_matrix_insights_type ON public.matrix_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_matrix_insights_created_at ON public.matrix_insights(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matrix_patterns_status ON public.matrix_patterns(status);
CREATE INDEX IF NOT EXISTS idx_matrix_patterns_detected_at ON public.matrix_patterns(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_matrix_roadmap_status ON public.matrix_roadmap(status);
CREATE INDEX IF NOT EXISTS idx_matrix_roadmap_priority ON public.matrix_roadmap(priority, priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_matrix_memory_type ON public.matrix_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_matrix_memory_created_at ON public.matrix_memory(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matrix_chat_user_id ON public.matrix_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_matrix_chat_created_at ON public.matrix_chat_history(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_matrix_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_matrix_insights_updated_at
  BEFORE UPDATE ON public.matrix_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_matrix_updated_at();

CREATE TRIGGER update_matrix_patterns_updated_at
  BEFORE UPDATE ON public.matrix_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_matrix_updated_at();

CREATE TRIGGER update_matrix_roadmap_updated_at
  BEFORE UPDATE ON public.matrix_roadmap
  FOR EACH ROW
  EXECUTE FUNCTION update_matrix_updated_at();