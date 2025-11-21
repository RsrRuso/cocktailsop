-- Add DELETE policies for inventory_activity_log table

-- Allow users to delete their own activity logs (personal inventory)
CREATE POLICY "Users can delete own activity logs"
ON public.inventory_activity_log
FOR DELETE
TO authenticated
USING (
  (workspace_id IS NULL AND auth.uid() = user_id)
);

-- Allow users to delete activity logs in their workspaces
CREATE POLICY "Users can delete activity logs in their workspaces"
ON public.inventory_activity_log
FOR DELETE
TO authenticated
USING (
  (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);