-- Fix teams RLS authentication issue
-- Drop the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;

-- Create a function to automatically set created_by
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically set created_by to the current user
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

-- Create trigger to auto-set created_by before insert
DROP TRIGGER IF EXISTS set_teams_created_by ON public.teams;
CREATE TRIGGER set_teams_created_by
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();

-- Create a simpler INSERT policy that just checks authentication
CREATE POLICY "Authenticated users can create teams"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (true);