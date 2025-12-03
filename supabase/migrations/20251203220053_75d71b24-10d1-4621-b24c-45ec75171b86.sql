-- Create music storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('music', 'music', true, 10485760, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload music
CREATE POLICY "Authenticated users can upload music"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'music');

-- Allow public read access
CREATE POLICY "Public music access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'music');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own music"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);