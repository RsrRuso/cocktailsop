-- Create automation system tables

-- Automation webhooks table
CREATE TABLE IF NOT EXISTS public.automation_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT NOT NULL,
  webhook_type TEXT NOT NULL CHECK (webhook_type IN ('zapier', 'make', 'n8n', 'custom')),
  is_active BOOLEAN DEFAULT true,
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Automation triggers table
CREATE TABLE IF NOT EXISTS public.automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_post', 'new_follower', 'new_message', 'new_event', 'new_music_share', 'schedule', 'custom')),
  webhook_id UUID REFERENCES public.automation_webhooks(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Automation execution logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.automation_triggers(id) ON DELETE SET NULL,
  webhook_id UUID REFERENCES public.automation_webhooks(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  payload JSONB,
  response JSONB,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_webhooks
CREATE POLICY "Users can view own webhooks"
  ON public.automation_webhooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
  ON public.automation_webhooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON public.automation_webhooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON public.automation_webhooks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for automation_triggers
CREATE POLICY "Users can view own triggers"
  ON public.automation_triggers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own triggers"
  ON public.automation_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own triggers"
  ON public.automation_triggers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own triggers"
  ON public.automation_triggers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for automation_logs
CREATE POLICY "Users can view own logs"
  ON public.automation_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert logs"
  ON public.automation_logs FOR INSERT
  WITH CHECK (true);

-- Function to update webhook last_triggered_at
CREATE OR REPLACE FUNCTION public.update_webhook_trigger_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE automation_webhooks
  SET 
    trigger_count = trigger_count + 1,
    last_triggered_at = now(),
    updated_at = now()
  WHERE id = NEW.webhook_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update webhook stats
CREATE TRIGGER update_webhook_stats_trigger
  AFTER INSERT ON automation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_trigger_stats();

-- Indexes for performance
CREATE INDEX idx_automation_webhooks_user_id ON automation_webhooks(user_id);
CREATE INDEX idx_automation_triggers_user_id ON automation_triggers(user_id);
CREATE INDEX idx_automation_triggers_webhook_id ON automation_triggers(webhook_id);
CREATE INDEX idx_automation_logs_user_id ON automation_logs(user_id);
CREATE INDEX idx_automation_logs_executed_at ON automation_logs(executed_at DESC);

COMMENT ON TABLE automation_webhooks IS 'Stores webhook URLs for external automation platforms (Zapier, Make, n8n, custom)';
COMMENT ON TABLE automation_triggers IS 'Defines what events trigger which webhooks';
COMMENT ON TABLE automation_logs IS 'Execution history and logs for all automations';