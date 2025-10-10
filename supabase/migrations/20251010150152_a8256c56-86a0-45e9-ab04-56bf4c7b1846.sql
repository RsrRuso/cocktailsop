-- Fix 1: Create proper role management system to prevent privilege escalation
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('user', 'moderator', 'admin', 'founder');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can revoke roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Migrate existing founder data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'founder'::app_role
FROM public.profiles
WHERE is_founder = true
ON CONFLICT DO NOTHING;

-- Fix 2: Update profiles RLS policy to respect privacy flags
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable with privacy controls"
ON public.profiles
FOR SELECT
USING (
  CASE 
    WHEN auth.uid() = id THEN true -- Own profile: see everything
    ELSE (
      -- Respect privacy flags for others
      (show_phone = true OR phone IS NULL OR phone = '') AND
      (show_whatsapp = true OR whatsapp IS NULL OR whatsapp = '') AND
      (show_website = true OR website IS NULL OR website = '')
    )
  END
);

-- Restrict is_founder and is_verified updates to prevent self-escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing is_founder or is_verified
  is_founder = (SELECT is_founder FROM profiles WHERE id = auth.uid()) AND
  is_verified = (SELECT is_verified FROM profiles WHERE id = auth.uid())
);