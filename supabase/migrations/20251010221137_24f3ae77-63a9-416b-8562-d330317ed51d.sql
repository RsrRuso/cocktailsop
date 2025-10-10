-- Update stories bucket to support audio/webm for voice messages and more video formats
UPDATE storage.buckets
SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'video/mp4', 
    'video/webm', 
    'video/quicktime',
    'video/x-msvideo',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE name = 'stories';