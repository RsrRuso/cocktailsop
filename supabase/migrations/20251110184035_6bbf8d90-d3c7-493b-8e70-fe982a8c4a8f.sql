-- Add hierarchy and advanced features to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS task_number TEXT,
ADD COLUMN IF NOT EXISTS watchers UUID[],
ADD COLUMN IF NOT EXISTS deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS time_tracking jsonb DEFAULT '{"spent": 0, "estimated": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dependencies UUID[];

-- Create task templates table
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

-- Create task hierarchy view function
CREATE OR REPLACE FUNCTION get_task_hierarchy(task_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  level INTEGER
) AS $$
WITH RECURSIVE task_tree AS (
  SELECT t.id, t.title, 0 as level, t.parent_task_id
  FROM tasks t
  WHERE t.id = task_id
  
  UNION ALL
  
  SELECT t.id, t.title, tt.level + 1, t.parent_task_id
  FROM tasks t
  INNER JOIN task_tree tt ON t.parent_task_id = tt.id
)
SELECT id, title, level FROM task_tree;
$$ LANGUAGE sql STABLE;

-- Add auto-increment task number function
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
DECLARE
  team_prefix TEXT;
  next_number INTEGER;
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM tasks
    WHERE team_id = NEW.team_id AND task_number IS NOT NULL;
    
    SELECT UPPER(LEFT(name, 3)) INTO team_prefix FROM teams WHERE id = NEW.team_id;
    NEW.task_number := team_prefix || '-' || next_number;
  ELSE
    SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM tasks
    WHERE user_id = NEW.user_id AND team_id IS NULL AND task_number IS NOT NULL;
    
    NEW.task_number := 'TASK-' || next_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task number generation
DROP TRIGGER IF EXISTS set_task_number ON tasks;
CREATE TRIGGER set_task_number
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_task_number();

-- Enable RLS on task_templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

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
  metric_type TEXT NOT NULL, -- 'views', 'interests', 'connections', 'investments'
  metric_value NUMERIC NOT NULL DEFAULT 0,
  idea_id UUID REFERENCES business_ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, metric_type, idea_id)
);

-- Enable RLS
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON business_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON business_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update analytics
CREATE OR REPLACE FUNCTION update_business_analytics()
RETURNS void AS $$
BEGIN
  -- Update views analytics
  INSERT INTO business_analytics (user_id, date, metric_type, metric_value, idea_id)
  SELECT 
    bi.user_id,
    CURRENT_DATE,
    'views',
    bi.view_count,
    bi.id
  FROM business_ideas bi
  ON CONFLICT (user_id, date, metric_type, idea_id)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- Update interests analytics  
  INSERT INTO business_analytics (user_id, date, metric_type, metric_value, idea_id)
  SELECT 
    bi.user_id,
    CURRENT_DATE,
    'interests',
    bi.interest_count,
    bi.id
  FROM business_ideas bi
  ON CONFLICT (user_id, date, metric_type, idea_id)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify watchers when task is updated
CREATE OR REPLACE FUNCTION notify_task_watchers()
RETURNS TRIGGER AS $$
DECLARE
  watcher_id UUID;
  updater_username TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.watchers IS NOT NULL THEN
    SELECT username INTO updater_username FROM profiles WHERE id = auth.uid();
    
    FOREACH watcher_id IN ARRAY NEW.watchers
    LOOP
      IF watcher_id != auth.uid() THEN
        PERFORM create_notification(
          watcher_id,
          'task_updated',
          updater_username || ' updated task: ' || NEW.title
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_watchers_on_task_update ON tasks;
CREATE TRIGGER notify_watchers_on_task_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_watchers();