-- Add title field to team_members for job hierarchy
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Member';

-- Add workload capacity field to team_members
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS workload_capacity INTEGER DEFAULT 40;

-- Create function to get team member workload
CREATE OR REPLACE FUNCTION public.get_member_workload(member_user_id UUID, member_team_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM tasks
  WHERE assigned_to = member_user_id
  AND team_id = member_team_id
  AND status NOT IN ('completed', 'cancelled');
$$;

-- Create function to get team statistics
CREATE OR REPLACE FUNCTION public.get_team_stats(team_uuid UUID)
RETURNS TABLE(
  total_tasks INTEGER,
  completed_tasks INTEGER,
  pending_tasks INTEGER,
  in_progress_tasks INTEGER,
  total_members INTEGER,
  total_hours_logged NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT t.id)::INTEGER as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)::INTEGER as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END)::INTEGER as pending_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END)::INTEGER as in_progress_tasks,
    COUNT(DISTINCT tm.user_id)::INTEGER as total_members,
    COALESCE(SUM((t.time_tracking->>'spent')::numeric), 0) as total_hours_logged
  FROM tasks t
  LEFT JOIN team_members tm ON tm.team_id = t.team_id
  WHERE t.team_id = team_uuid;
$$;