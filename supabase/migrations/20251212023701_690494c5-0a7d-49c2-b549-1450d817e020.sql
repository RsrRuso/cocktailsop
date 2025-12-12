-- Create storage bucket for purchase order documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-orders', 'purchase-orders', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to purchase-orders bucket
CREATE POLICY "Users can upload purchase order files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'purchase-orders' AND auth.role() = 'authenticated');

-- Allow authenticated users to read their uploaded files
CREATE POLICY "Users can read purchase order files"
ON storage.objects FOR SELECT
USING (bucket_id = 'purchase-orders' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their files
CREATE POLICY "Users can delete purchase order files"
ON storage.objects FOR DELETE
USING (bucket_id = 'purchase-orders' AND auth.role() = 'authenticated');