-- Allow anyone to view recipes that are linked to active QR codes
-- This enables QR code scanning workflow for batch submissions
CREATE POLICY "Anyone can view recipes linked to active QR codes"
ON public.batch_recipes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM batch_qr_codes 
    WHERE batch_qr_codes.recipe_id::uuid = batch_recipes.id 
    AND batch_qr_codes.is_active = true
  )
);

-- Allow authenticated users to insert batch productions via QR code workflow
-- Even if they don't own the recipe, if they have access to an active QR code
CREATE POLICY "Authenticated users can submit via active QR codes"
ON public.batch_productions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM batch_qr_codes 
    WHERE batch_qr_codes.is_active = true
    AND (batch_qr_codes.user_id = batch_productions.user_id OR batch_qr_codes.group_id = batch_productions.group_id)
  )
);