-- Modify stories table to support multiple media items
ALTER TABLE public.stories 
  DROP COLUMN media_url,
  DROP COLUMN media_type;

ALTER TABLE public.stories
  ADD COLUMN media_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN media_types TEXT[] NOT NULL DEFAULT '{}';