-- Add visibility column to business_ideas table
ALTER TABLE public.business_ideas 
ADD COLUMN visibility text NOT NULL DEFAULT 'public' 
CHECK (visibility IN ('draft', 'private', 'public'));

-- Add index for faster filtering
CREATE INDEX idx_business_ideas_visibility ON public.business_ideas(visibility);

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Business ideas viewable by everyone" ON public.business_ideas;

-- Create new SELECT policy: owners see all their ideas, others only see public ones
CREATE POLICY "Users can view public ideas or own ideas"
ON public.business_ideas
FOR SELECT
USING (
  visibility = 'public' 
  OR auth.uid() = user_id
);

-- Add comment for documentation
COMMENT ON COLUMN public.business_ideas.visibility IS 'Controls idea visibility: draft (only owner), private (only owner), public (everyone)';