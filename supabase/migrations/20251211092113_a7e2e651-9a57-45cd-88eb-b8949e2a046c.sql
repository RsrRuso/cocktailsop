-- Allow anyone to insert batch productions when they have access to active QR codes (public scanning)
DROP POLICY IF EXISTS "Anyone can submit production via active QR code" ON public.batch_productions;
CREATE POLICY "Anyone can submit production via active QR code" 
ON public.batch_productions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.batch_qr_codes 
    WHERE batch_qr_codes.recipe_id::uuid = batch_productions.recipe_id 
    AND batch_qr_codes.is_active = true
  )
);

-- Allow anyone to insert batch production ingredients for valid productions
DROP POLICY IF EXISTS "Anyone can insert ingredients for valid productions" ON public.batch_production_ingredients;
CREATE POLICY "Anyone can insert ingredients for valid productions" 
ON public.batch_production_ingredients 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.batch_productions bp
    JOIN public.batch_qr_codes qr ON qr.recipe_id::uuid = bp.recipe_id AND qr.is_active = true
    WHERE bp.id = batch_production_ingredients.production_id
  )
);