-- Create batch inventory sync tracking table
CREATE TABLE IF NOT EXISTS public.batch_inventory_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES batch_productions(id) ON DELETE CASCADE,
  bottle_id uuid REFERENCES lab_ops_bottles(id) ON DELETE SET NULL,
  ingredient_name text NOT NULL,
  amount_ml numeric NOT NULL DEFAULT 0,
  sync_type text NOT NULL DEFAULT 'deduct', -- deduct, restore
  synced_at timestamptz NOT NULL DEFAULT now(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.batch_inventory_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies for batch_inventory_sync
CREATE POLICY "Users can view their own sync records"
  ON public.batch_inventory_sync FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batch_productions bp 
      WHERE bp.id = production_id AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sync records for their productions"
  ON public.batch_inventory_sync FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_productions bp 
      WHERE bp.id = production_id AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own sync records"
  ON public.batch_inventory_sync FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM batch_productions bp 
      WHERE bp.id = production_id AND bp.user_id = auth.uid()
    )
  );

-- Function to sync batch production with LAB Ops inventory
CREATE OR REPLACE FUNCTION public.sync_batch_to_inventory(
  p_production_id uuid,
  p_outlet_id uuid,
  p_action text DEFAULT 'deduct' -- 'deduct' or 'restore'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ingredient RECORD;
  v_bottle RECORD;
  v_amount_ml numeric;
  v_synced_count int := 0;
  v_result jsonb := '[]'::jsonb;
BEGIN
  -- Get all ingredients for this production
  FOR v_ingredient IN
    SELECT ingredient_name, scaled_amount, unit
    FROM batch_production_ingredients
    WHERE production_id = p_production_id
  LOOP
    -- Convert to ml if needed (assume ml or similar units)
    v_amount_ml := CASE 
      WHEN lower(v_ingredient.unit) IN ('ml', 'milliliter', 'milliliters') THEN v_ingredient.scaled_amount
      WHEN lower(v_ingredient.unit) IN ('l', 'liter', 'liters') THEN v_ingredient.scaled_amount * 1000
      WHEN lower(v_ingredient.unit) IN ('oz', 'ounce', 'ounces') THEN v_ingredient.scaled_amount * 29.5735
      WHEN lower(v_ingredient.unit) IN ('cl', 'centiliter', 'centiliters') THEN v_ingredient.scaled_amount * 10
      ELSE v_ingredient.scaled_amount -- Default assume ml
    END;

    -- Find matching bottle by spirit_type or bottle_name (case insensitive)
    SELECT * INTO v_bottle
    FROM lab_ops_bottles
    WHERE outlet_id = p_outlet_id
      AND status = 'active'
      AND (
        lower(spirit_type) ILIKE '%' || lower(v_ingredient.ingredient_name) || '%'
        OR lower(bottle_name) ILIKE '%' || lower(v_ingredient.ingredient_name) || '%'
        OR lower(v_ingredient.ingredient_name) ILIKE '%' || lower(spirit_type) || '%'
        OR lower(v_ingredient.ingredient_name) ILIKE '%' || lower(bottle_name) || '%'
      )
    ORDER BY current_level_ml DESC -- Use bottle with most stock first
    LIMIT 1;

    IF v_bottle.id IS NOT NULL THEN
      IF p_action = 'deduct' THEN
        -- Deduct from bottle
        UPDATE lab_ops_bottles
        SET current_level_ml = GREATEST(0, current_level_ml - v_amount_ml),
            updated_at = now()
        WHERE id = v_bottle.id;

        -- Record sync
        INSERT INTO batch_inventory_sync (production_id, bottle_id, ingredient_name, amount_ml, sync_type, outlet_id)
        VALUES (p_production_id, v_bottle.id, v_ingredient.ingredient_name, v_amount_ml, 'deduct', p_outlet_id);
      ELSE
        -- Restore to bottle
        UPDATE lab_ops_bottles
        SET current_level_ml = LEAST(bottle_size_ml, current_level_ml + v_amount_ml),
            updated_at = now()
        WHERE id = v_bottle.id;

        -- Record sync
        INSERT INTO batch_inventory_sync (production_id, bottle_id, ingredient_name, amount_ml, sync_type, outlet_id)
        VALUES (p_production_id, v_bottle.id, v_ingredient.ingredient_name, v_amount_ml, 'restore', p_outlet_id);
      END IF;

      v_synced_count := v_synced_count + 1;
      v_result := v_result || jsonb_build_object(
        'ingredient', v_ingredient.ingredient_name,
        'bottle_id', v_bottle.id,
        'bottle_name', v_bottle.bottle_name,
        'amount_ml', v_amount_ml,
        'action', p_action
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'synced_count', v_synced_count,
    'details', v_result
  );
END;
$$;

-- Function to restore inventory when batch is deleted or edited
CREATE OR REPLACE FUNCTION public.restore_batch_inventory(
  p_production_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sync RECORD;
  v_restored_count int := 0;
BEGIN
  -- Get all previous deductions for this production
  FOR v_sync IN
    SELECT * FROM batch_inventory_sync
    WHERE production_id = p_production_id
      AND sync_type = 'deduct'
      AND bottle_id IS NOT NULL
  LOOP
    -- Restore the amount to the bottle
    UPDATE lab_ops_bottles
    SET current_level_ml = LEAST(bottle_size_ml, current_level_ml + v_sync.amount_ml),
        updated_at = now()
    WHERE id = v_sync.bottle_id;

    v_restored_count := v_restored_count + 1;
  END LOOP;

  -- Delete old sync records for this production
  DELETE FROM batch_inventory_sync WHERE production_id = p_production_id;

  RETURN jsonb_build_object(
    'success', true,
    'restored_count', v_restored_count
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_batch_to_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_batch_inventory TO authenticated;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_batch_inventory_sync_production ON batch_inventory_sync(production_id);
CREATE INDEX IF NOT EXISTS idx_batch_inventory_sync_bottle ON batch_inventory_sync(bottle_id);