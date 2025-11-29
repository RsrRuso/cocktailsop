-- Add missing RLS policies for batch_production_ingredients to allow user CRUD operations

-- Allow users to update ingredients for their own batch productions
CREATE POLICY "Users can update ingredients of own productions" 
ON batch_production_ingredients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM batch_productions 
    WHERE batch_productions.id = batch_production_ingredients.production_id 
    AND batch_productions.user_id = auth.uid()
  )
);

-- Allow users to delete ingredients for their own batch productions
CREATE POLICY "Users can delete ingredients of own productions" 
ON batch_production_ingredients 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM batch_productions 
    WHERE batch_productions.id = batch_production_ingredients.production_id 
    AND batch_productions.user_id = auth.uid()
  )
);