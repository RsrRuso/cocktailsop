-- Add user type to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
    ALTER TABLE profiles ADD COLUMN user_type text CHECK (user_type IN ('entrepreneur', 'investor', 'both')) DEFAULT 'entrepreneur';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'interests') THEN
    ALTER TABLE profiles ADD COLUMN interests text[] DEFAULT '{}';
  END IF;
END $$;

-- Drop and recreate business_ideas table to ensure clean state
DROP TABLE IF EXISTS idea_interests CASCADE;
DROP TABLE IF EXISTS business_ideas CASCADE;

CREATE TABLE business_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  headline text NOT NULL,
  description text NOT NULL,
  hashtags text[] DEFAULT '{}',
  category text NOT NULL,
  funding_goal numeric,
  current_funding numeric DEFAULT 0,
  stage text CHECK (stage IN ('idea', 'prototype', 'mvp', 'growing', 'scaling')) DEFAULT 'idea',
  looking_for text[] DEFAULT '{}',
  media_urls text[] DEFAULT '{}',
  view_count integer DEFAULT 0,
  interest_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create investor_profiles table
DROP TABLE IF EXISTS investor_profiles CASCADE;
CREATE TABLE investor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  investment_focus text[] DEFAULT '{}',
  investment_range_min numeric,
  investment_range_max numeric,
  preferred_stages text[] DEFAULT '{}',
  industries text[] DEFAULT '{}',
  bio text,
  portfolio_url text,
  linkedin_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create idea_interests table
CREATE TABLE idea_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid REFERENCES business_ideas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('interested', 'contacted', 'meeting', 'invested')) DEFAULT 'interested',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

-- Enable RLS
ALTER TABLE business_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_ideas
CREATE POLICY "Business ideas viewable by everyone"
  ON business_ideas FOR SELECT
  USING (true);

CREATE POLICY "Users can create own business ideas"
  ON business_ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business ideas"
  ON business_ideas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business ideas"
  ON business_ideas FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for investor_profiles
CREATE POLICY "Investor profiles viewable by everyone"
  ON investor_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create own investor profile"
  ON investor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investor profile"
  ON investor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investor profile"
  ON investor_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for idea_interests
CREATE POLICY "Users can view own interests"
  ON idea_interests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Idea owners can view their idea interests"
  ON idea_interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_ideas
      WHERE business_ideas.id = idea_interests.idea_id
      AND business_ideas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create interests"
  ON idea_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interests"
  ON idea_interests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
  ON idea_interests FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_business_ideas_updated_at
  BEFORE UPDATE ON business_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investor_profiles_updated_at
  BEFORE UPDATE ON investor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update interest count
CREATE OR REPLACE FUNCTION update_idea_interest_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE business_ideas 
    SET interest_count = interest_count + 1 
    WHERE id = NEW.idea_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE business_ideas 
    SET interest_count = GREATEST(interest_count - 1, 0)
    WHERE id = OLD.idea_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_idea_interest_count_trigger
  AFTER INSERT OR DELETE ON idea_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_interest_count();