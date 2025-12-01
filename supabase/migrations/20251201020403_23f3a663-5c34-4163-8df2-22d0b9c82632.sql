-- Create career profiles table
CREATE TABLE IF NOT EXISTS public.career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_title TEXT,
  experience_years INTEGER,
  career_goals TEXT[],
  target_positions TEXT[],
  skills TEXT[],
  certifications TEXT[],
  interests TEXT[],
  preferred_locations TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create career recommendations table
CREATE TABLE IF NOT EXISTS public.career_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create skill progress tracking table
CREATE TABLE IF NOT EXISTS public.skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  current_level INTEGER DEFAULT 1,
  target_level INTEGER DEFAULT 10,
  progress_percentage INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  milestones JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create career activity log
CREATE TABLE IF NOT EXISTS public.career_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  achievement_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own career profile"
  ON public.career_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career profile"
  ON public.career_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career profile"
  ON public.career_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations"
  ON public.career_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON public.career_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own skill progress"
  ON public.skill_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill progress"
  ON public.skill_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill progress"
  ON public.skill_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own career activities"
  ON public.career_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career activities"
  ON public.career_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_career_profiles_user_id ON public.career_profiles(user_id);
CREATE INDEX idx_career_recommendations_user_id ON public.career_recommendations(user_id);
CREATE INDEX idx_career_recommendations_status ON public.career_recommendations(status);
CREATE INDEX idx_skill_progress_user_id ON public.skill_progress(user_id);
CREATE INDEX idx_career_activities_user_id ON public.career_activities(user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_career_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_career_profiles_updated_at
  BEFORE UPDATE ON public.career_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_career_updated_at();

CREATE TRIGGER update_skill_progress_updated_at
  BEFORE UPDATE ON public.skill_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_career_updated_at();