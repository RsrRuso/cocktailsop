-- Create time logs table for detailed time tracking
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_logs
CREATE POLICY "Users can view time logs for their tasks"
  ON time_logs FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = time_logs.task_id 
      AND (
        tasks.user_id = auth.uid() OR 
        tasks.assigned_to = auth.uid() OR
        (tasks.team_id IS NOT NULL AND is_team_member(auth.uid(), tasks.team_id))
      )
    )
  );

CREATE POLICY "Users can create their own time logs"
  ON time_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time logs"
  ON time_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time logs"
  ON time_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update task time_tracking on time log changes
CREATE OR REPLACE FUNCTION update_task_time_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_seconds INTEGER;
BEGIN
  -- Calculate total time spent on the task
  SELECT COALESCE(SUM(duration_seconds), 0)
  INTO total_seconds
  FROM time_logs
  WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
  AND ended_at IS NOT NULL;
  
  -- Update task time_tracking
  UPDATE tasks
  SET time_tracking = jsonb_build_object(
    'spent', total_seconds / 3600.0,
    'estimated', COALESCE((time_tracking->>'estimated')::numeric, 0)
  )
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_time_tracking_on_log ON time_logs;
CREATE TRIGGER update_time_tracking_on_log
  AFTER INSERT OR UPDATE OR DELETE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_task_time_tracking();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_started_at ON time_logs(started_at);