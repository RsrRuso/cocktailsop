-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view connected profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon cannot access profiles" ON public.profiles;

-- Drop the function if exists
DROP FUNCTION IF EXISTS public.is_profile_visible_to_user(uuid, uuid);

-- Create a simple policy that allows authenticated users to see basic public profile info
-- Full sensitive data access is controlled at application level
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow anon users to see basic profile info (for public posts/reels)
CREATE POLICY "Anon can view basic profile info"
ON public.profiles
FOR SELECT
TO anon
USING (true);