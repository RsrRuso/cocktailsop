-- Create venues table with regions
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'bar', 'restaurant', 'hotel', 'nightclub', etc.
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UAE',
  address TEXT,
  contact_email TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employment verifications table
CREATE TABLE public.employment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  UNIQUE(user_id, venue_id, start_date)
);

-- Enable RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for venues (public read)
CREATE POLICY "Venues are viewable by everyone"
ON public.venues FOR SELECT
TO authenticated
USING (true);

-- RLS policies for employment verifications
CREATE POLICY "Users can view own verifications"
ON public.employment_verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
ON public.employment_verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
ON public.employment_verifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Insert Dubai venues
INSERT INTO public.venues (name, type, region, city, address) VALUES
('Barasti Beach Bar', 'bar', 'Dubai', 'Dubai', 'Le Meridien Mina Seyahi Beach Resort'),
('White Dubai', 'nightclub', 'Dubai', 'Dubai', 'Meydan Racecourse'),
('Soho Garden', 'nightclub', 'Dubai', 'Dubai', 'Meydan'),
('Cafe Del Mar', 'bar', 'Dubai', 'Dubai', 'Rixos Premium Dubai JBR'),
('Zero Gravity', 'bar', 'Dubai', 'Dubai', 'Skydive Dubai'),
('Buddha Bar', 'bar', 'Dubai', 'Dubai', 'Grosvenor House'),
('Billionaire Mansion', 'nightclub', 'Dubai', 'Dubai', 'Taj Hotel'),
('Mantis', 'bar', 'Dubai', 'Dubai', 'Souk Madinat Jumeirah'),
('The Penthouse', 'bar', 'Dubai', 'Dubai', 'FIVE Palm Jumeirah'),
('Cavalli Club', 'nightclub', 'Dubai', 'Dubai', 'Fairmont Hotel'),
('STK Dubai', 'restaurant', 'Dubai', 'Dubai', 'Address Downtown'),
('Nusr-Et Steakhouse', 'restaurant', 'Dubai', 'Dubai', 'Four Seasons DIFC'),
('La Petite Maison', 'restaurant', 'Dubai', 'Dubai', 'DIFC'),
('Zuma Dubai', 'restaurant', 'Dubai', 'Dubai', 'DIFC Gate Village'),
('Nobu Dubai', 'restaurant', 'Dubai', 'Dubai', 'Atlantis The Palm'),
('Pier 7', 'restaurant', 'Dubai', 'Dubai', 'Dubai Marina'),
('Atmosphere Burj Khalifa', 'restaurant', 'Dubai', 'Dubai', 'Burj Khalifa Level 122'),
('At.mosphere', 'bar', 'Dubai', 'Dubai', 'Burj Khalifa'),
('Torno Subito', 'restaurant', 'Dubai', 'Dubai', 'W Dubai The Palm'),
('Coya Dubai', 'restaurant', 'Dubai', 'Dubai', 'Four Seasons DIFC');

-- Create function to notify venue on verification request
CREATE OR REPLACE FUNCTION public.notify_venue_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  venue_name TEXT;
  user_name TEXT;
BEGIN
  SELECT name INTO venue_name FROM venues WHERE id = NEW.venue_id;
  SELECT username INTO user_name FROM profiles WHERE id = NEW.user_id;
  
  PERFORM create_notification(
    NEW.user_id,
    'verification_pending',
    'Verification request sent to ' || venue_name
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for venue verification notifications
CREATE TRIGGER on_verification_request
AFTER INSERT ON public.employment_verifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_venue_verification();