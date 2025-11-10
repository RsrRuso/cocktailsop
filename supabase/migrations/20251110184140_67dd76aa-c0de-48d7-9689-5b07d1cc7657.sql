-- Add hierarchy and advanced features to tasks (IF NOT EXISTS)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS task_number TEXT,
ADD COLUMN IF NOT EXISTS watchers UUID[],
ADD COLUMN IF NOT EXISTS deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS time_tracking jsonb DEFAULT '{"spent": 0, "estimated": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dependencies UUID[];

-- Create task templates table if not exists
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  estimated_hours NUMERIC,
  checklist jsonb DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on task_templates if not enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'task_templates' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own and team templates" ON task_templates;
DROP POLICY IF EXISTS "Users can create templates" ON task_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON task_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON task_templates;

-- RLS policies for task_templates
CREATE POLICY "Users can view their own and team templates"
  ON task_templates FOR SELECT
  USING (
    auth.uid() = user_id OR
    (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

CREATE POLICY "Users can create templates"
  ON task_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON task_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON task_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Add analytics table for business hub
CREATE TABLE IF NOT EXISTS business_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  idea_id UUID REFERENCES business_ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, metric_type, idea_id)
);

-- Enable RLS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'business_analytics' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view own analytics" ON business_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON business_analytics;

CREATE POLICY "Users can view own analytics"
  ON business_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON business_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);