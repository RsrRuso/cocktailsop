-- Add is_bot field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;

-- Create bot_activity_log table to track bot actions
CREATE TABLE IF NOT EXISTS public.bot_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  target_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on bot_activity_log
ALTER TABLE public.bot_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view bot activity logs
CREATE POLICY "Admins can view bot activity logs"
ON public.bot_activity_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_bot_id ON public.bot_activity_log(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_created_at ON public.bot_activity_log(created_at DESC);