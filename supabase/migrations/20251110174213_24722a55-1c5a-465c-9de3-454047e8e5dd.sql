-- Fix search_path for has_task_manager_access function
CREATE OR REPLACE FUNCTION public.has_task_manager_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE user_id = _user_id;
  
  IF sub_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if in trial period
  IF sub_record.trial_ends_at > now() THEN
    RETURN true;
  END IF;
  
  -- Check if has active subscription
  IF sub_record.status = 'active' AND (sub_record.subscription_ends_at IS NULL OR sub_record.subscription_ends_at > now()) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;