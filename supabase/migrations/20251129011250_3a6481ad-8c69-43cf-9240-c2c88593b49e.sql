-- Create batch recipes table (templates)
CREATE TABLE IF NOT EXISTS public.batch_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_name TEXT NOT NULL,
  description TEXT,
  current_serves NUMERIC NOT NULL DEFAULT 1,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create batch productions table (actual batches made)
CREATE TABLE IF NOT EXISTS public.batch_productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.batch_recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  batch_name TEXT NOT NULL,
  target_serves NUMERIC NOT NULL,
  target_liters NUMERIC NOT NULL,
  production_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  produced_by_name TEXT,
  produced_by_email TEXT,
  qr_code_data TEXT,
  notes TEXT,
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create batch production ingredients table
CREATE TABLE IF NOT EXISTS public.batch_production_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES public.batch_productions(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  original_amount NUMERIC NOT NULL,
  scaled_amount NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create mixologist groups table
CREATE TABLE IF NOT EXISTS public.mixologist_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  qr_code_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create mixologist group members table
CREATE TABLE IF NOT EXISTS public.mixologist_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.mixologist_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.batch_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_production_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mixologist_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mixologist_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_recipes
CREATE POLICY "Users can view their own recipes and group recipes"
  ON public.batch_recipes FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.batch_productions bp
      JOIN public.mixologist_group_members mgm ON bp.group_id = mgm.group_id
      WHERE bp.recipe_id = batch_recipes.id AND mgm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own recipes"
  ON public.batch_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON public.batch_recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON public.batch_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for batch_productions
CREATE POLICY "Users can view their own productions and group productions"
  ON public.batch_productions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.mixologist_group_members
      WHERE group_id = batch_productions.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create productions"
  ON public.batch_productions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own productions"
  ON public.batch_productions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for batch_production_ingredients
CREATE POLICY "Users can view ingredients of accessible productions"
  ON public.batch_production_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.batch_productions
      WHERE id = batch_production_ingredients.production_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.mixologist_group_members
          WHERE group_id = batch_productions.group_id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create production ingredients"
  ON public.batch_production_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.batch_productions
      WHERE id = batch_production_ingredients.production_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for mixologist_groups
CREATE POLICY "Users can view groups they are members of"
  ON public.mixologist_groups FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.mixologist_group_members
      WHERE group_id = mixologist_groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON public.mixologist_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON public.mixologist_groups FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups"
  ON public.mixologist_groups FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for mixologist_group_members
CREATE POLICY "Users can view members of their groups"
  ON public.mixologist_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mixologist_groups
      WHERE id = mixologist_group_members.group_id
      AND (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.mixologist_group_members m2
        WHERE m2.group_id = mixologist_groups.id AND m2.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Group creators can add members"
  ON public.mixologist_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mixologist_groups
      WHERE id = mixologist_group_members.group_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove members"
  ON public.mixologist_group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.mixologist_groups
      WHERE id = mixologist_group_members.group_id AND created_by = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_batch_productions_recipe_id ON public.batch_productions(recipe_id);
CREATE INDEX idx_batch_productions_group_id ON public.batch_productions(group_id);
CREATE INDEX idx_batch_production_ingredients_production_id ON public.batch_production_ingredients(production_id);
CREATE INDEX idx_mixologist_group_members_group_id ON public.mixologist_group_members(group_id);
CREATE INDEX idx_mixologist_group_members_user_id ON public.mixologist_group_members(user_id);