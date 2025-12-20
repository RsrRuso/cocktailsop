-- Create storage bucket for wasabi media if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('wasabi-media', 'wasabi-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for wasabi-media bucket
CREATE POLICY "Users can upload wasabi media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wasabi-media');

CREATE POLICY "Anyone can view wasabi media"
ON storage.objects FOR SELECT
USING (bucket_id = 'wasabi-media');

CREATE POLICY "Users can delete own wasabi media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wasabi-media' AND auth.uid()::text = (storage.foldername(name))[2]);