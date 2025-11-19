-- Enable realtime for inventory and transfers tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transfers;