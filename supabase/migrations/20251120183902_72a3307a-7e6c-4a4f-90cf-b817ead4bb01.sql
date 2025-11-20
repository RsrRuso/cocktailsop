-- Add special_events column to weekly_schedules table
ALTER TABLE weekly_schedules 
ADD COLUMN IF NOT EXISTS special_events jsonb DEFAULT '{}'::jsonb;