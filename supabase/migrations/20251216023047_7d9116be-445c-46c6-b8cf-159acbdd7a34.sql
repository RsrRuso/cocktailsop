-- Allow public read access to procurement workspaces for PIN access page
CREATE POLICY "Anyone can view procurement workspaces"
ON public.procurement_workspaces
FOR SELECT
USING (true);