-- Create storage buckets for posts and reels
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('posts', 'posts', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('reels', 'reels', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for posts bucket
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own post images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for reels bucket
CREATE POLICY "Anyone can view reel videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'reels');

CREATE POLICY "Authenticated users can upload reel videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reels' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own reel videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'reels' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own reel videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reels' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);