
-- Fix the audit trigger to handle tables without outlet_id
CREATE OR REPLACE FUNCTION public.log_smart_pourer_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_outlet_id UUID;
BEGIN
  -- Try to get outlet_id from different sources depending on table
  IF TG_TABLE_NAME = 'smart_pourer_device_pairings' THEN
    SELECT outlet_id INTO v_outlet_id FROM public.smart_pourer_devices WHERE id = COALESCE(NEW.device_id, OLD.device_id) LIMIT 1;
  ELSIF TG_TABLE_NAME = 'smart_pourer_pour_events' THEN
    SELECT outlet_id INTO v_outlet_id FROM public.smart_pourer_devices WHERE id = COALESCE(NEW.device_id, OLD.device_id) LIMIT 1;
  ELSE
    -- For tables that have outlet_id directly
    IF TG_OP = 'DELETE' THEN
      v_outlet_id := OLD.outlet_id;
    ELSE
      v_outlet_id := NEW.outlet_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.smart_pourer_audit_log (outlet_id, action, entity_type, entity_id, actor_id, details)
    VALUES (
      v_outlet_id,
      'created',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      jsonb_build_object('new', row_to_json(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.smart_pourer_audit_log (outlet_id, action, entity_type, entity_id, actor_id, details)
    VALUES (
      v_outlet_id,
      'updated',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.smart_pourer_audit_log (outlet_id, action, entity_type, entity_id, actor_id, details)
    VALUES (
      v_outlet_id,
      'deleted',
      TG_TABLE_NAME,
      OLD.id,
      auth.uid(),
      jsonb_build_object('old', row_to_json(OLD))
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
