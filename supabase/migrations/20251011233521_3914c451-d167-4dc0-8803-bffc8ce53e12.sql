
-- Add preview URLs to songs that don't have them
WITH numbered AS (
  SELECT track_id, 
         ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM popular_music 
  WHERE preview_url IS NULL
)
UPDATE popular_music 
SET preview_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-' || ((numbered.rn - 1) % 16 + 1) || '.mp3'
FROM numbered
WHERE popular_music.track_id = numbered.track_id;
