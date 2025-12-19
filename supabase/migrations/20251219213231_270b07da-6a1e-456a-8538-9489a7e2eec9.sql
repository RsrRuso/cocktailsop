-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create policy: Users can view their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy: Allow viewing basic public info of other users (for social features)
-- This uses a security definer function to safely check visibility settings
CREATE OR REPLACE FUNCTION public.is_profile_visible_to_user(profile_user_id uuid, requesting_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Always visible to the profile owner
    profile_user_id = requesting_user_id
    OR
    -- Check if users are connected (followers/following relationship)
    EXISTS (
      SELECT 1 FROM public.follows 
      WHERE follower_id = requesting_user_id 
      AND following_id = profile_user_id
    )
$$;

-- Policy for authenticated users to view other profiles (limited fields enforced in app)
CREATE POLICY "Users can view connected profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_profile_visible_to_user(id, auth.uid())
);

-- Prevent anonymous users from accessing profiles directly
CREATE POLICY "Anon cannot access profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);