-- Allow staff members to see their own LAB Ops staff membership (for Profile → My Spaces)
CREATE POLICY "Staff can view their own staff membership"
ON public.lab_ops_staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());