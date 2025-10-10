-- Add INSERT policy for notifications table to allow trigger functions to create notifications
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- This allows the notification trigger functions to insert notifications
-- The functions are SECURITY DEFINER so they run with elevated privileges