-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add team_id to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create task_reminders table
CREATE TABLE IF NOT EXISTS public.task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- Create function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = _team_id
    AND user_id = _user_id
  )
$$;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they are members of"
  ON public.teams FOR SELECT
  USING (is_team_member(auth.uid(), id));

CREATE POLICY "Users can create their own teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team owners and admins can update team"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners can delete team"
  ON public.teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view members of their teams"
  ON public.team_members FOR SELECT
  USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can remove members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Update tasks RLS policies to include team access
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks or team tasks"
  ON public.tasks FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = assigned_to
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
    OR has_task_manager_access(auth.uid())
  );

DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
CREATE POLICY "Users can create tasks for themselves or their teams"
  ON public.tasks FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_task_manager_access(auth.uid()))
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks or team tasks"
  ON public.tasks FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR auth.uid() = assigned_to
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks or team tasks"
  ON public.tasks FOR DELETE
  USING (
    auth.uid() = user_id
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

-- RLS Policies for task_reminders
CREATE POLICY "Users can view their own reminders"
  ON public.task_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reminders for tasks they can access"
  ON public.task_reminders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_reminders.task_id
      AND (
        tasks.user_id = auth.uid()
        OR tasks.assigned_to = auth.uid()
        OR (tasks.team_id IS NOT NULL AND is_team_member(auth.uid(), tasks.team_id))
      )
    )
  );

CREATE POLICY "Users can update their own reminders"
  ON public.task_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.task_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to notify team members of task assignments
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigner_username TEXT;
  task_title TEXT;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    SELECT username INTO assigner_username FROM profiles WHERE id = auth.uid();
    task_title := NEW.title;
    
    PERFORM create_notification(
      NEW.assigned_to,
      'task_assigned',
      assigner_username || ' assigned you a task: ' || task_title
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for task assignment notifications
CREATE TRIGGER notify_on_task_assignment
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();

-- Function to notify team members of task updates
CREATE OR REPLACE FUNCTION public.notify_team_task_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updater_username TEXT;
  task_title TEXT;
  team_member_id UUID;
BEGIN
  IF NEW.team_id IS NOT NULL AND TG_OP = 'UPDATE' THEN
    SELECT username INTO updater_username FROM profiles WHERE id = auth.uid();
    task_title := NEW.title;
    
    -- Notify all team members except the person who made the update
    FOR team_member_id IN 
      SELECT user_id FROM team_members 
      WHERE team_id = NEW.team_id 
      AND user_id != auth.uid()
    LOOP
      PERFORM create_notification(
        team_member_id,
        'task_updated',
        updater_username || ' updated task: ' || task_title
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for team task updates
CREATE TRIGGER notify_on_team_task_update
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_task_update();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON public.task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_user_id ON public.task_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_remind_at ON public.task_reminders(remind_at) WHERE sent = false;