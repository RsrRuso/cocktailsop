-- Create table for storing weekly staff schedules
CREATE TABLE IF NOT EXISTS public.weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  schedule_data JSONB NOT NULL,
  venue_name TEXT,
  daily_events JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own weekly schedules"
  ON public.weekly_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly schedules"
  ON public.weekly_schedules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly schedules"
  ON public.weekly_schedules
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly schedules"
  ON public.weekly_schedules
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_user_week ON public.weekly_schedules(user_id, week_start_date);