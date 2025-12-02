-- Fix search_path security warnings for new functions
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE automation_templates
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM automation_template_reviews
    WHERE template_id = NEW.template_id
  )
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION update_template_install_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE automation_templates
  SET install_count = (
    SELECT COUNT(*)
    FROM automation_template_installs
    WHERE template_id = NEW.template_id
  )
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';