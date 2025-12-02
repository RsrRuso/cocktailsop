-- Add scheduled automation support
ALTER TABLE automation_triggers
ADD COLUMN IF NOT EXISTS schedule_cron TEXT,
ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

-- Add conditional logic support
ALTER TABLE automation_triggers
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;

-- Create automation templates table for marketplace
CREATE TABLE IF NOT EXISTS automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  workflow_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  install_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create template reviews table
CREATE TABLE IF NOT EXISTS automation_template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES automation_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create template installs tracking
CREATE TABLE IF NOT EXISTS automation_template_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES automation_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Enable RLS
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_template_installs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view public templates"
  ON automation_templates FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON automation_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON automation_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON automation_templates FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for reviews
CREATE POLICY "Users can view all reviews"
  ON automation_template_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON automation_template_reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON automation_template_reviews FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON automation_template_reviews FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for installs
CREATE POLICY "Users can view their own installs"
  ON automation_template_installs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can track their installs"
  ON automation_template_installs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_templates_user ON automation_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_templates_public ON automation_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_automation_templates_category ON automation_templates(category);
CREATE INDEX IF NOT EXISTS idx_template_reviews_template ON automation_template_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_template_installs_user ON automation_template_installs(user_id);

-- Function to update template rating
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update rating on review
DROP TRIGGER IF EXISTS trigger_update_template_rating ON automation_template_reviews;
CREATE TRIGGER trigger_update_template_rating
AFTER INSERT OR UPDATE OR DELETE ON automation_template_reviews
FOR EACH ROW EXECUTE FUNCTION update_template_rating();

-- Function to update install count
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update install count
DROP TRIGGER IF EXISTS trigger_update_install_count ON automation_template_installs;
CREATE TRIGGER trigger_update_install_count
AFTER INSERT ON automation_template_installs
FOR EACH ROW EXECUTE FUNCTION update_template_install_count();