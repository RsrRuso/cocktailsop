-- Create batch calculator activity tracking table
CREATE TABLE public.batch_calculator_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid REFERENCES public.mixologist_groups(id) ON DELETE SET NULL,
  session_id uuid NOT NULL,
  action_type text NOT NULL,
  duration_seconds integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_batch_activity_user ON public.batch_calculator_activity(user_id);
CREATE INDEX idx_batch_activity_group ON public.batch_calculator_activity(group_id);
CREATE INDEX idx_batch_activity_session ON public.batch_calculator_activity(session_id);
CREATE INDEX idx_batch_activity_type ON public.batch_calculator_activity(action_type);
CREATE INDEX idx_batch_activity_created ON public.batch_calculator_activity(created_at DESC);

-- Enable RLS
ALTER TABLE public.batch_calculator_activity ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
ON public.batch_calculator_activity FOR SELECT
USING (auth.uid() = user_id);

-- Users can view group activity if they're a member
CREATE POLICY "Group members can view group activity"
ON public.batch_calculator_activity FOR SELECT
USING (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM mixologist_group_members
    WHERE mixologist_group_members.group_id = batch_calculator_activity.group_id
    AND mixologist_group_members.user_id = auth.uid()
  )
);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity"
ON public.batch_calculator_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_calculator_activity;