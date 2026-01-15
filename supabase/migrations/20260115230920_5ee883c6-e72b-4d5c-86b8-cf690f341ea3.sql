-- Create batch_production_losses table to track losses during production
CREATE TABLE IF NOT EXISTS public.batch_production_losses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES public.batch_productions(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  loss_amount_ml NUMERIC NOT NULL DEFAULT 0,
  loss_reason TEXT CHECK (loss_reason IN ('spillage', 'evaporation', 'measurement_error', 'equipment_residue', 'quality_issue', 'overpouring', 'training', 'other')),
  notes TEXT,
  recorded_by_user_id UUID REFERENCES auth.users(id),
  recorded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_production_losses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view losses from their productions"
  ON public.batch_production_losses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.batch_productions bp
      WHERE bp.id = batch_production_losses.production_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert losses for their productions"
  ON public.batch_production_losses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.batch_productions bp
      WHERE bp.id = production_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update losses for their productions"
  ON public.batch_production_losses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.batch_productions bp
      WHERE bp.id = batch_production_losses.production_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete losses from their productions"
  ON public.batch_production_losses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.batch_productions bp
      WHERE bp.id = batch_production_losses.production_id
      AND bp.user_id = auth.uid()
    )
  );

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_production_losses;

-- Create index for faster queries
CREATE INDEX idx_batch_production_losses_production_id ON public.batch_production_losses(production_id);
CREATE INDEX idx_batch_production_losses_created_at ON public.batch_production_losses(created_at DESC);