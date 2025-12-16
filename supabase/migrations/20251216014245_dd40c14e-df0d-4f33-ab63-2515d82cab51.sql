
-- Create function to delete old po_received_records (older than 2 weeks)
CREATE OR REPLACE FUNCTION public.delete_old_po_received_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete received items first (foreign key constraint)
  DELETE FROM public.purchase_order_received_items
  WHERE receiving_id IN (
    SELECT id FROM public.po_received_records
    WHERE created_at < NOW() - INTERVAL '14 days'
  );
  
  -- Delete old received records
  DELETE FROM public.po_received_records
  WHERE created_at < NOW() - INTERVAL '14 days';
END;
$$;

-- Create a scheduled job using pg_cron (runs daily at midnight)
-- Note: pg_cron extension must be enabled
SELECT cron.schedule(
  'delete-old-po-records',
  '0 0 * * *',
  'SELECT public.delete_old_po_received_records();'
);
