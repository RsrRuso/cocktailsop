-- Drop existing policies and recreate correctly
DROP POLICY IF EXISTS "Workspace owners can manage procurement staff" ON public.procurement_staff;

-- Recreate owner policy
CREATE POLICY "Workspace owners can manage procurement staff"
ON public.procurement_staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM procurement_workspaces pw
    WHERE pw.id = procurement_staff.workspace_id
    AND pw.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM procurement_workspaces pw
    WHERE pw.id = procurement_staff.workspace_id
    AND pw.owner_id = auth.uid()
  )
);