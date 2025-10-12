-- Create work_experiences table for career growth tracking
CREATE TABLE IF NOT EXISTS work_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  position text NOT NULL,
  employment_type text NOT NULL, -- Full-time, Part-time, Contract, Freelance, Internship
  location text,
  is_current boolean DEFAULT false,
  start_date date NOT NULL,
  end_date date,
  description text,
  skills text[], -- Array of skills used
  is_project boolean DEFAULT false, -- Differentiate between job and project
  project_link text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_experiences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own experiences"
ON work_experiences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own experiences"
ON work_experiences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiences"
ON work_experiences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences"
ON work_experiences FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_work_experiences_user_id ON work_experiences(user_id);
CREATE INDEX idx_work_experiences_dates ON work_experiences(start_date DESC, end_date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_work_experiences_updated_at
  BEFORE UPDATE ON work_experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();