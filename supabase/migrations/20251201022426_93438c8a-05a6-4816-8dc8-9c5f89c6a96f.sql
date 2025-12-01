-- Create platform_bugs table for AI-detected issues
CREATE TABLE IF NOT EXISTS public.platform_bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_type TEXT NOT NULL, -- 'error', 'warning', 'performance', 'ui', 'logic'
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT, -- page/component where bug was found
  reproduction_steps TEXT[],
  error_details JSONB,
  ai_analysis TEXT,
  status TEXT NOT NULL DEFAULT 'reported', -- 'reported', 'acknowledged', 'in_progress', 'resolved', 'wont_fix'
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_platform_bugs_status ON public.platform_bugs(status);
CREATE INDEX idx_platform_bugs_severity ON public.platform_bugs(severity);
CREATE INDEX idx_platform_bugs_detected_at ON public.platform_bugs(detected_at DESC);

-- Enable RLS
ALTER TABLE public.platform_bugs ENABLE ROW LEVEL SECURITY;

-- Policy: Founders can view all bugs
CREATE POLICY "Founders can view all bugs"
  ON public.platform_bugs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'founder'
    )
  );

-- Policy: Founders can update bugs
CREATE POLICY "Founders can update bugs"
  ON public.platform_bugs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'founder'
    )
  );

-- Policy: System can insert bugs (for AI)
CREATE POLICY "System can insert bugs"
  ON public.platform_bugs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_platform_bugs_updated_at
  BEFORE UPDATE ON public.platform_bugs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();