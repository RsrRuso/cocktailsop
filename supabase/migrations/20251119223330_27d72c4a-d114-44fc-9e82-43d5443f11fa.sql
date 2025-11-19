-- Drop the old manager notification function and trigger
DROP TRIGGER IF EXISTS handle_access_request_notification_trigger ON access_requests;
DROP FUNCTION IF EXISTS handle_access_request_notification();

-- The workspace owner notification trigger (on_access_request_created) is already in place and working correctly