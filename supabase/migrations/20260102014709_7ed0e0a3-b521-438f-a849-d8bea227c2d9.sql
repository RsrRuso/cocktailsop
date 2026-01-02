-- Create a table for storing multiple custom profile links with icons
CREATE TABLE public.profile_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_url TEXT,
  icon_type TEXT DEFAULT 'custom', -- 'custom', 'instagram', 'twitter', 'linkedin', 'youtube', etc.
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

-- Users can view any visible links on profiles
CREATE POLICY "Anyone can view visible profile links"
ON public.profile_links
FOR SELECT
USING (is_visible = true);

-- Users can manage their own links
CREATE POLICY "Users can insert their own links"
ON public.profile_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
ON public.profile_links
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
ON public.profile_links
FOR DELETE
USING (auth.uid() = user_id);

-- Users can view all their own links (including hidden ones)
CREATE POLICY "Users can view all their own links"
ON public.profile_links
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_profile_links_user_id ON public.profile_links(user_id);
CREATE INDEX idx_profile_links_sort_order ON public.profile_links(user_id, sort_order);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profile_links_updated_at
BEFORE UPDATE ON public.profile_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();