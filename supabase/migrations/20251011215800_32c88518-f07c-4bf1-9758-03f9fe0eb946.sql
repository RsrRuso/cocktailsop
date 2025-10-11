-- Add venue_name and address columns to events table
ALTER TABLE events 
ADD COLUMN venue_name TEXT,
ADD COLUMN address TEXT;