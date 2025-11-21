
-- Allow authenticated users to view workspace name for access requests
-- This is needed when someone scans a QR code to request access
CREATE POLICY "Anyone can view workspace name for access requests"
ON public.workspaces
FOR SELECT
TO authenticated
USING (true);
