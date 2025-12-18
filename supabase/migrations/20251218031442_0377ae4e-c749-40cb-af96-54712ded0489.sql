-- Create table to track PO items synced to FIFO
CREATE TABLE public.po_fifo_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_received_item_id UUID REFERENCES public.purchase_order_received_items(id) ON DELETE CASCADE,
  po_received_record_id UUID REFERENCES public.po_received_records(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC,
  expiration_date DATE,
  fifo_store_id UUID REFERENCES public.fifo_stores(id) ON DELETE SET NULL,
  fifo_inventory_id UUID REFERENCES public.fifo_inventory(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'rejected')),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  synced_at TIMESTAMPTZ,
  synced_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.po_fifo_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own po_fifo_sync"
  ON public.po_fifo_sync FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own po_fifo_sync"
  ON public.po_fifo_sync FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own po_fifo_sync"
  ON public.po_fifo_sync FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own po_fifo_sync"
  ON public.po_fifo_sync FOR DELETE
  USING (auth.uid() = user_id);

-- Workspace member policies
CREATE POLICY "Workspace members can view po_fifo_sync"
  ON public.po_fifo_sync FOR SELECT
  USING (
    workspace_id IS NOT NULL AND 
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Workspace members can insert po_fifo_sync"
  ON public.po_fifo_sync FOR INSERT
  WITH CHECK (
    workspace_id IS NOT NULL AND 
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Workspace members can update po_fifo_sync"
  ON public.po_fifo_sync FOR UPDATE
  USING (
    workspace_id IS NOT NULL AND 
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Indexes
CREATE INDEX idx_po_fifo_sync_status ON public.po_fifo_sync(status);
CREATE INDEX idx_po_fifo_sync_user_id ON public.po_fifo_sync(user_id);
CREATE INDEX idx_po_fifo_sync_workspace_id ON public.po_fifo_sync(workspace_id);
CREATE INDEX idx_po_fifo_sync_po_received_record_id ON public.po_fifo_sync(po_received_record_id);

-- Trigger for updated_at
CREATE TRIGGER update_po_fifo_sync_updated_at
  BEFORE UPDATE ON public.po_fifo_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();