
-- Create anomaly logs table if missing
CREATE TABLE IF NOT EXISTS public.smart_pourer_anomaly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.smart_pourer_devices(id) ON DELETE SET NULL,
  sku_id UUID REFERENCES public.smart_pourer_skus(id) ON DELETE SET NULL,
  anomaly_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  detected_at TIMESTAMPTZ DEFAULT now(),
  details JSONB,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  notes TEXT
);

-- Create offline queue table if missing
CREATE TABLE IF NOT EXISTS public.smart_pourer_offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  device_code TEXT NOT NULL,
  pour_data JSONB NOT NULL,
  queued_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ,
  sync_attempts INTEGER DEFAULT 0,
  sync_error TEXT
);

-- Enable RLS if not already enabled
ALTER TABLE public.smart_pourer_anomaly_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_offline_queue ENABLE ROW LEVEL SECURITY;

-- Create policies if not exist (will fail silently if exists)
DO $$ BEGIN
  CREATE POLICY "sp_anomaly_select" ON public.smart_pourer_anomaly_logs FOR SELECT USING (public.is_lab_ops_outlet_member(auth.uid(), outlet_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "sp_anomaly_insert" ON public.smart_pourer_anomaly_logs FOR INSERT WITH CHECK (public.is_lab_ops_outlet_member(auth.uid(), outlet_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "sp_anomaly_update" ON public.smart_pourer_anomaly_logs FOR UPDATE USING (public.is_lab_ops_outlet_member(auth.uid(), outlet_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "sp_offline_all" ON public.smart_pourer_offline_queue FOR ALL USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
