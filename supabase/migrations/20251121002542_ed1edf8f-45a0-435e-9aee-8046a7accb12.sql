
-- Allow workspace owners to view access requests for their workspaces
CREATE POLICY "Workspace owners can view access requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = access_requests.workspace_id
      AND w.owner_id = auth.uid()
  )
);

-- Allow workspace owners to update (approve/reject) access requests for their workspaces
CREATE POLICY "Workspace owners can update access requests"
ON public.access_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = access_requests.workspace_id
      AND w.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = access_requests.workspace_id
      AND w.owner_id = auth.uid()
  )
);
