-- Allow FIFO workspace members to view PO received records for syncing
CREATE POLICY "FIFO workspace members can view PO received records"
ON public.po_received_records
FOR SELECT
USING (
  -- Allow if user has FIFO inventory access (manager or member)
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM fifo_items fi WHERE fi.user_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);