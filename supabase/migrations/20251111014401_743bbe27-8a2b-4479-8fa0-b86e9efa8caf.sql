-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id, 
      username, 
      full_name, 
      date_of_birth,
      email,
      email_verified
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      CASE 
        WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
        THEN (NEW.raw_user_meta_data->>'date_of_birth')::date 
        ELSE NULL 
      END,
      NEW.email,
      NEW.email_confirmed_at IS NOT NULL
    );
  END IF;
  
  -- Ensure subscription exists
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) THEN
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;