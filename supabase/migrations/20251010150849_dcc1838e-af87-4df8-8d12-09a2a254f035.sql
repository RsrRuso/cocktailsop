-- Fix 1: Add owner tracking to venues table and create RLS policies
ALTER TABLE public.venues ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.venues ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow authenticated users to create venues
CREATE POLICY "Authenticated users can create venues"
ON public.venues FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Allow venue owners to update their venues
CREATE POLICY "Owners can update their venues"
ON public.venues FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Allow venue owners to delete their venues
CREATE POLICY "Owners can delete their venues"
ON public.venues FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Allow admins to manage any venue
CREATE POLICY "Admins can update any venue"
ON public.venues FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Create secure view for profiles with privacy controls
-- This view will respect the underlying table's RLS policies
CREATE VIEW public.profiles_public AS
SELECT 
  id, username, full_name, bio, avatar_url, cover_url,
  professional_title, badge_level,
  follower_count, following_count, post_count,
  region, is_founder, is_verified,
  created_at, updated_at,
  CASE WHEN show_phone THEN phone ELSE NULL END as phone,
  CASE WHEN show_whatsapp THEN whatsapp ELSE NULL END as whatsapp,
  CASE WHEN show_website THEN website ELSE NULL END as website,
  show_phone, show_whatsapp, show_website
FROM public.profiles;

-- Grant select on view to authenticated and anon users
GRANT SELECT ON public.profiles_public TO authenticated, anon;