-- ============================================
-- SPECVERSE EXAMINATION SYSTEM - Phase 1
-- Database & Question Bank Foundation
-- ============================================

-- Exam Categories (Theory, Practical Decision, Speed, Costing, Sensory)
CREATE TABLE public.exam_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Badge/Certification Levels
CREATE TABLE public.exam_badge_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Bronze, Silver, Gold, Platinum, Diamond
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  icon TEXT,
  color TEXT,
  benefits TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Question Bank
CREATE TABLE public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.exam_categories(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL DEFAULT 'mcq', -- mcq, image_id, scenario, speed, costing, sensory
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard, expert
  question_text TEXT NOT NULL,
  question_media_url TEXT, -- for images/videos
  options JSONB DEFAULT '[]', -- array of {id, text, is_correct, weight}
  correct_answer TEXT,
  explanation TEXT,
  points INTEGER DEFAULT 10,
  time_limit_seconds INTEGER DEFAULT 60,
  tags TEXT[],
  metadata JSONB DEFAULT '{}', -- for sensory matrix, costing formulas, etc.
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Test Sessions (User taking an exam)
CREATE TABLE public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.exam_categories(id),
  exam_type TEXT NOT NULL DEFAULT 'full', -- full, practice, category_only
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, abandoned
  total_questions INTEGER DEFAULT 0,
  answered_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  max_possible_score INTEGER DEFAULT 0,
  percentage_score NUMERIC(5,2) DEFAULT 0,
  time_started TIMESTAMPTZ DEFAULT now(),
  time_ended TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  badge_level_id UUID REFERENCES public.exam_badge_levels(id),
  ai_analysis JSONB DEFAULT '{}', -- weakness matrix, recommendations
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Answer Log (Individual question responses)
CREATE TABLE public.exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_answer TEXT,
  selected_options JSONB DEFAULT '[]', -- for multi-select
  is_correct BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Certificates
CREATE TABLE public.exam_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.exam_sessions(id),
  badge_level_id UUID REFERENCES public.exam_badge_levels(id),
  certificate_number TEXT UNIQUE,
  category_id UUID REFERENCES public.exam_categories(id),
  score INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  pdf_url TEXT,
  is_verified BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Analytics (Aggregated user stats)
CREATE TABLE public.exam_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.exam_categories(id),
  total_exams_taken INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  average_score NUMERIC(5,2) DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  current_badge_level_id UUID REFERENCES public.exam_badge_levels(id),
  weakness_areas JSONB DEFAULT '[]', -- [{area, score, recommendation}]
  strength_areas JSONB DEFAULT '[]',
  improvement_plan JSONB DEFAULT '{}',
  last_exam_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Enable RLS
ALTER TABLE public.exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_badge_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Categories (public read)
CREATE POLICY "Anyone can view exam categories" ON public.exam_categories FOR SELECT USING (true);

-- RLS Policies: Badge Levels (public read)
CREATE POLICY "Anyone can view badge levels" ON public.exam_badge_levels FOR SELECT USING (true);

-- RLS Policies: Questions (public read for active)
CREATE POLICY "Anyone can view active questions" ON public.exam_questions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage questions" ON public.exam_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('founder', 'manager'))
);

-- RLS Policies: Sessions (user own data)
CREATE POLICY "Users can view own sessions" ON public.exam_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.exam_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.exam_sessions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies: Answers (user own data)
CREATE POLICY "Users can view own answers" ON public.exam_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own answers" ON public.exam_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Certificates (user own + public verification)
CREATE POLICY "Users can view own certificates" ON public.exam_certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Verified certificates are public" ON public.exam_certificates FOR SELECT USING (is_verified = true);
CREATE POLICY "System can create certificates" ON public.exam_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Performance (user own data)
CREATE POLICY "Users can view own performance" ON public.exam_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own performance" ON public.exam_performance FOR ALL USING (auth.uid() = user_id);

-- Insert default badge levels
INSERT INTO public.exam_badge_levels (name, min_score, max_score, icon, color, benefits, sort_order) VALUES
('Bronze Practitioner', 0, 59, '🥉', '#CD7F32', ARRAY['Basic certification', 'Profile badge'], 1),
('Silver Specialist', 60, 74, '🥈', '#C0C0C0', ARRAY['Mid-level certification', 'Priority support', 'Profile badge'], 2),
('Gold Beverage Developer', 75, 84, '🥇', '#FFD700', ARRAY['Advanced certification', 'Industry recognition', 'Profile badge'], 3),
('Platinum Beverage Architect', 85, 94, '💎', '#E5E4E2', ARRAY['Expert certification', 'Mentorship access', 'Profile badge'], 4),
('Diamond Industry Leader', 95, 100, '👑', '#B9F2FF', ARRAY['Elite certification', 'Industry board access', 'Profile badge'], 5);

-- Insert default exam categories
INSERT INTO public.exam_categories (name, description, icon, sort_order) VALUES
('Theory', 'Fundamental professional knowledge - spirits, wines, beers, cocktails, hygiene, costing', '📚', 1),
('Practical Decision', 'AI-evaluated scenario-based decision making', '🧠', 2),
('Speed & Consistency', 'Timed execution and recipe assembly accuracy', '⚡', 3),
('Costing & Profitability', 'Pricing, margins, and commercial calculations', '💰', 4),
('Sensory Intelligence', 'Taste, aroma, and flavor calibration assessment', '👃', 5);

-- Function to generate certificate numbers
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  random_part := UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 8));
  new_number := 'SV-' || year_part || '-' || random_part;
  RETURN new_number;
END;
$$;

-- Trigger to auto-generate certificate number
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_certificate_number_trigger
  BEFORE INSERT ON public.exam_certificates
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_number();

-- Function to update performance after session completion
CREATE OR REPLACE FUNCTION update_exam_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO exam_performance (user_id, category_id, total_exams_taken, total_questions_answered, correct_answers, average_score, best_score, current_badge_level_id, last_exam_date)
    VALUES (NEW.user_id, NEW.category_id, 1, NEW.answered_questions, NEW.correct_answers, NEW.percentage_score, NEW.total_score, NEW.badge_level_id, NOW())
    ON CONFLICT (user_id, category_id) DO UPDATE SET
      total_exams_taken = exam_performance.total_exams_taken + 1,
      total_questions_answered = exam_performance.total_questions_answered + EXCLUDED.total_questions_answered,
      correct_answers = exam_performance.correct_answers + EXCLUDED.correct_answers,
      average_score = (exam_performance.average_score * exam_performance.total_exams_taken + EXCLUDED.average_score) / (exam_performance.total_exams_taken + 1),
      best_score = GREATEST(exam_performance.best_score, EXCLUDED.best_score),
      current_badge_level_id = CASE WHEN EXCLUDED.best_score > exam_performance.best_score THEN EXCLUDED.current_badge_level_id ELSE exam_performance.current_badge_level_id END,
      last_exam_date = NOW(),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_performance_on_session_complete
  AFTER UPDATE ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_exam_performance();