-- Table for pending received items awaiting approval to be added to inventory
CREATE TABLE IF NOT EXISTS public.lab_ops_pending_received_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_code TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  document_number TEXT,
  supplier_name TEXT,
  received_date DATE,
  received_by TEXT,
  po_record_id UUID,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_ops_pending_received_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view pending items for their outlets"
  ON public.lab_ops_pending_received_items FOR SELECT
  USING (outlet_id IN (SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid())
    OR outlet_id IN (SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can insert pending items"
  ON public.lab_ops_pending_received_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update pending items for their outlets"
  ON public.lab_ops_pending_received_items FOR UPDATE
  USING (outlet_id IN (SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete pending items for their outlets"
  ON public.lab_ops_pending_received_items FOR DELETE
  USING (outlet_id IN (SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()));

-- Add recipe_id to menu items for ingredient deduction linking
ALTER TABLE public.lab_ops_menu_items 
ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.lab_ops_recipes(id);

-- Enable realtime for pending items
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_ops_pending_received_items;