-- Create table for FIFO alert settings
CREATE TABLE IF NOT EXISTS public.fifo_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  days_before_expiry INTEGER NOT NULL DEFAULT 30,
  alert_recipients UUID[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.fifo_alert_settings ENABLE ROW LEVEL SECURITY;

-- Workspace owners and managers can view settings
CREATE POLICY "Workspace members can view alert settings"
  ON public.fifo_alert_settings
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Workspace owners and managers can insert settings
CREATE POLICY "Workspace owners can create alert settings"
  ON public.fifo_alert_settings
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Workspace owners and managers can update settings
CREATE POLICY "Workspace members can update alert settings"
  ON public.fifo_alert_settings
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Workspace owners can delete settings
CREATE POLICY "Workspace owners can delete alert settings"
  ON public.fifo_alert_settings
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );