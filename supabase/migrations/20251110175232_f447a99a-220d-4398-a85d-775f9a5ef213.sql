-- Add new columns to tasks table for enhanced functionality
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;

-- Create task comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task activity log table
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_comments
CREATE POLICY "Users can view comments on their tasks"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id 
      AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can create comments on their tasks"
  ON task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id 
      AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can update own comments"
  ON task_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON task_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for task_activity
CREATE POLICY "Users can view activity on their tasks"
  ON task_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_activity.task_id 
      AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can create activity logs"
  ON task_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Create function to log task activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO task_activity (task_id, user_id, action, details)
      VALUES (NEW.id, auth.uid(), 'status_changed', 
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO task_activity (task_id, user_id, action, details)
      VALUES (NEW.id, auth.uid(), 'assigned', 
        jsonb_build_object('assigned_to', NEW.assigned_to));
    END IF;
    
    IF OLD.priority != NEW.priority THEN
      INSERT INTO task_activity (task_id, user_id, action, details)
      VALUES (NEW.id, auth.uid(), 'priority_changed', 
        jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO task_activity (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'created', jsonb_build_object('title', NEW.title));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for task activity logging
DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();