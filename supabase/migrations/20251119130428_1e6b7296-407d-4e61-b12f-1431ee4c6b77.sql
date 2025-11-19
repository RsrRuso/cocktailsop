-- Enable RLS on access_requests if not already enabled
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can insert access requests" ON access_requests;
DROP POLICY IF EXISTS "Users can view their own access requests" ON access_requests;
DROP POLICY IF EXISTS "Managers can view all access requests" ON access_requests;
DROP POLICY IF EXISTS "Managers can update access requests" ON access_requests;

-- Allow anyone (authenticated or not) to insert access requests
CREATE POLICY "Anyone can insert access requests"
ON access_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Allow users to view their own access requests (by user_id or email)
CREATE POLICY "Users can view their own access requests"
ON access_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow managers and founders to view all access requests
CREATE POLICY "Managers can view all access requests"
ON access_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager'::app_role) 
  OR 
  public.has_role(auth.uid(), 'founder'::app_role)
);

-- Allow managers and founders to update access requests
CREATE POLICY "Managers can update access requests"
ON access_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager'::app_role) 
  OR 
  public.has_role(auth.uid(), 'founder'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'manager'::app_role) 
  OR 
  public.has_role(auth.uid(), 'founder'::app_role)
);