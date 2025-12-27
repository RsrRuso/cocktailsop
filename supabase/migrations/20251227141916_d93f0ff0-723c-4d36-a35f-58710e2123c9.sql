-- Link POS menu items to inventory items (for stock-based items like bottled water)
ALTER TABLE public.lab_ops_menu_items
ADD COLUMN IF NOT EXISTS inventory_item_id uuid;

DO $$ BEGIN
  ALTER TABLE public.lab_ops_menu_items
  ADD CONSTRAINT lab_ops_menu_items_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id)
  REFERENCES public.lab_ops_inventory_items(id)
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_ops_menu_items_inventory_item_id
ON public.lab_ops_menu_items (inventory_item_id);
