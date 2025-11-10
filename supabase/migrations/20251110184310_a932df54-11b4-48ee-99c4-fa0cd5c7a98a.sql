-- Fix function search paths for security

-- Fix generate_task_number function
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger for task number generation  
DROP TRIGGER IF EXISTS set_task_number ON tasks;
CREATE TRIGGER set_task_number
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_task_number();

-- Fix update_business_analytics function
CREATE OR REPLACE FUNCTION update_business_analytics()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix notify_task_watchers function
CREATE OR REPLACE FUNCTION notify_task_watchers()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS notify_watchers_on_task_update ON tasks;
CREATE TRIGGER notify_watchers_on_task_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_watchers();

-- Add get_task_hierarchy function with proper search path
CREATE OR REPLACE FUNCTION get_task_hierarchy(task_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  level INTEGER
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;