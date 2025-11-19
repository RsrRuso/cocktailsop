-- Fix security warnings: Set search_path on functions
CREATE OR REPLACE FUNCTION calculate_fifo_priority(
  p_expiration_date DATE,
  p_received_date TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_until_expiry INTEGER;
  days_in_inventory INTEGER;
  priority INTEGER;
BEGIN
  days_until_expiry := p_expiration_date - CURRENT_DATE;
  days_in_inventory := EXTRACT(DAY FROM (NOW() - p_received_date));
  
  priority := 100 - days_until_expiry + (days_in_inventory / 2);
  
  IF priority < 0 THEN
    priority := 0;
  END IF;
  
  RETURN priority;
END;
$$;

CREATE OR REPLACE FUNCTION update_inventory_priority()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.priority_score := calculate_fifo_priority(
    NEW.expiration_date::DATE,
    NEW.received_date
  );
  RETURN NEW;
END;
$$;