-- Create user locations table for real-time GPS tracking
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  ghost_mode BOOLEAN DEFAULT false,
  custom_status TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_location UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view locations of mutual follows only (unless ghost mode is on)
CREATE POLICY "view_mutual_follow_locations" ON public.user_locations
  FOR SELECT
  USING (
    ghost_mode = false 
    AND (
      -- User can see their own location
      auth.uid() = user_id
      OR
      -- User can see locations of mutual follows
      EXISTS (
        SELECT 1 FROM follows f1
        WHERE f1.follower_id = auth.uid() 
        AND f1.following_id = user_locations.user_id
        AND EXISTS (
          SELECT 1 FROM follows f2
          WHERE f2.follower_id = user_locations.user_id
          AND f2.following_id = auth.uid()
        )
      )
    )
  );

-- Policy: Users can update their own location
CREATE POLICY "update_own_location" ON public.user_locations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can insert their own location
CREATE POLICY "insert_own_location" ON public.user_locations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster location queries
CREATE INDEX idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX idx_user_locations_updated ON public.user_locations(last_updated DESC);

-- Enable realtime for location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;