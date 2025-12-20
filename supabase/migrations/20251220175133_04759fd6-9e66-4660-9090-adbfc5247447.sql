
-- Drop the overly permissive policy that exposes PIN codes
DROP POLICY IF EXISTS "Allow PIN verification for staff login" ON public.lab_ops_staff;

-- Create a secure PIN verification function
-- This function only returns success/failure, never exposes the actual PIN
CREATE OR REPLACE FUNCTION public.verify_staff_pin(
  p_outlet_id uuid,
  p_pin_code text
)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  staff_role text,
  staff_permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as staff_id,
    s.full_name as staff_name,
    s.role::text as staff_role,
    s.permissions as staff_permissions
  FROM public.lab_ops_staff s
  WHERE s.outlet_id = p_outlet_id
    AND s.pin_code = p_pin_code
    AND s.is_active = true;
END;
$$;

-- Grant execute to both authenticated and anon users (for PIN login before auth)
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(uuid, text) TO anon;

-- Create a policy that only allows outlet owners to read staff data
-- This prevents anonymous users from enumerating PINs
CREATE POLICY "Outlet owners can view their staff" 
ON public.lab_ops_staff 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lab_ops_outlets
    WHERE lab_ops_outlets.id = lab_ops_staff.outlet_id
    AND lab_ops_outlets.user_id = auth.uid()
  )
);
