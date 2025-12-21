-- Allow anyone (including anonymous users) to view profiles for explore/search
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);