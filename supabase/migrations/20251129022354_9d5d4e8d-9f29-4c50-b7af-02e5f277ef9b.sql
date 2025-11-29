-- Relax RLS on mixologist_group_members to ensure members are visible

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Group creators can view all members" ON public.mixologist_group_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON public.mixologist_group_members;

-- Create a simple, safe SELECT policy so UI can display members
-- Everyone who is logged in can see group members; INSERT/UPDATE/DELETE remain restricted
CREATE POLICY "Anyone can view mixologist group members"
ON public.mixologist_group_members
FOR SELECT
USING (auth.uid() IS NOT NULL);
