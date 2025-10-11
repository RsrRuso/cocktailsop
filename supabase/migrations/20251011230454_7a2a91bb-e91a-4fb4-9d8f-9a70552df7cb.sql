-- Create popular_music table
CREATE TABLE public.popular_music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration TEXT NOT NULL,
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.popular_music ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing music
CREATE POLICY "Music is viewable by everyone" 
ON public.popular_music 
FOR SELECT 
USING (true);

-- Insert popular music data
INSERT INTO public.popular_music (track_id, title, artist, duration, preview_url) VALUES
('1', 'Blinding Lights', 'The Weeknd', '3:20', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
('2', 'As It Was', 'Harry Styles', '2:47', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
('3', 'Heat Waves', 'Glass Animals', '3:59', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
('4', 'Levitating', 'Dua Lipa', '3:23', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
('5', 'Stay', 'The Kid LAROI, Justin Bieber', '2:21', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'),
('6', 'Good 4 U', 'Olivia Rodrigo', '2:58', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'),
('7', 'Peaches', 'Justin Bieber ft. Daniel Caesar', '3:18', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'),
('8', 'drivers license', 'Olivia Rodrigo', '4:02', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'),
('9', 'Save Your Tears', 'The Weeknd', '3:36', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'),
('10', 'Montero', 'Lil Nas X', '2:17', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'),
('11', 'Anti-Hero', 'Taylor Swift', '3:20', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3'),
('12', 'Calm Down', 'Rema & Selena Gomez', '3:59', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3'),
('13', 'Flowers', 'Miley Cyrus', '3:20', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3'),
('14', 'Unholy', 'Sam Smith & Kim Petras', '2:36', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3'),
('15', 'Vampire', 'Olivia Rodrigo', '3:39', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3');