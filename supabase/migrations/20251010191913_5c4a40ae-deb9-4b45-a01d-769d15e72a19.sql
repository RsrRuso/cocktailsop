-- Fix critical security issues - Part 2: Apply changes (fixed)

-- 1. Migrate existing is_founder and is_verified data to user_roles table BEFORE dropping columns
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'founder'::app_role 
FROM public.profiles 
WHERE is_founder = true
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'verified'::app_role 
FROM public.profiles 
WHERE is_verified = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Drop the problematic policy that depends on these columns
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Now drop the columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_founder;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_verified;

-- 4. Recreate the update policy without the circular checks
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Fix notifications RLS policy - restrict to proper authorization
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6. Add missing RLS policies for subscriptions
CREATE POLICY "Users can update own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. Add missing RLS policies for batch_calculations
CREATE POLICY "Users can update own calculations"
ON public.batch_calculations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calculations"
ON public.batch_calculations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 8. Add missing RLS policies for recipes
CREATE POLICY "Users can update own recipes"
ON public.recipes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
ON public.recipes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 9. Add input validation constraints
ALTER TABLE public.post_comments 
ADD CONSTRAINT check_content_length 
CHECK (length(trim(content)) > 0 AND length(content) <= 2000);

ALTER TABLE public.reel_comments 
ADD CONSTRAINT check_content_length 
CHECK (length(trim(content)) > 0 AND length(content) <= 2000);

ALTER TABLE public.story_comments 
ADD CONSTRAINT check_content_length 
CHECK (length(trim(content)) > 0 AND length(content) <= 2000);

ALTER TABLE public.messages 
ADD CONSTRAINT check_content_length 
CHECK (length(trim(content)) > 0 AND length(content) <= 5000);

-- 10. Create helper functions to check roles
CREATE OR REPLACE FUNCTION public.is_founder(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(user_id, 'founder'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_verified(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(user_id, 'verified'::app_role);
$$;