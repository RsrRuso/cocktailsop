-- Add alert_time column to fifo_alert_settings
ALTER TABLE fifo_alert_settings
ADD COLUMN IF NOT EXISTS alert_time TEXT DEFAULT '09:00';