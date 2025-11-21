-- Drop the correct trigger name that auto-syncs warehouse to Jerry
DROP TRIGGER IF EXISTS trigger_sync_warehouse_to_jerry ON inventory;

-- Drop the auto-sync function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS auto_sync_warehouse_to_jerry() CASCADE;