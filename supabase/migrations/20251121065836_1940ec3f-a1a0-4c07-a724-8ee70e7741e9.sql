-- Rename fifo_alert_settings table to stock_alert_settings
ALTER TABLE fifo_alert_settings RENAME TO stock_alert_settings;

-- Rename days_before_expiry column to minimum_quantity_threshold
ALTER TABLE stock_alert_settings RENAME COLUMN days_before_expiry TO minimum_quantity_threshold;

-- Update default value for minimum_quantity_threshold
ALTER TABLE stock_alert_settings ALTER COLUMN minimum_quantity_threshold SET DEFAULT 10;

-- Add comment to table
COMMENT ON TABLE stock_alert_settings IS 'Settings for low stock alerts - notifies when inventory quantities fall below threshold';

-- Add comment to column
COMMENT ON COLUMN stock_alert_settings.minimum_quantity_threshold IS 'Alert when item quantity falls below this threshold';