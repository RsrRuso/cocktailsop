-- Add fields to store story edits (music, filters, text overlays)
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS music_data jsonb,
ADD COLUMN IF NOT EXISTS filters jsonb,
ADD COLUMN IF NOT EXISTS text_overlays jsonb,
ADD COLUMN IF NOT EXISTS trim_data jsonb;

COMMENT ON COLUMN stories.music_data IS 'Stores music track info: {track_id, title, artist, preview_url}';
COMMENT ON COLUMN stories.filters IS 'Stores applied filters per media: [{filter: string, ...}]';
COMMENT ON COLUMN stories.text_overlays IS 'Stores text overlays per media: [{text, x, y, color, size}]';
COMMENT ON COLUMN stories.trim_data IS 'Stores video trim data: [{start: number, end: number}]';