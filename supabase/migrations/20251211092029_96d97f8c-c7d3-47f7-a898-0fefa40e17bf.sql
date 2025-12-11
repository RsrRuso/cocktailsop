-- Allow public read access to batch_qr_codes for scanning
DROP POLICY IF EXISTS "Anyone can view active QR codes" ON public.batch_qr_codes;
CREATE POLICY "Anyone can view active QR codes" 
ON public.batch_qr_codes 
FOR SELECT 
USING (is_active = true);

-- Allow public read access to batch_recipes linked to active QR codes
DROP POLICY IF EXISTS "Anyone can view recipes with active QR codes" ON public.batch_recipes;
CREATE POLICY "Anyone can view recipes with active QR codes" 
ON public.batch_recipes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.batch_qr_codes 
    WHERE batch_qr_codes.recipe_id::uuid = batch_recipes.id 
    AND batch_qr_codes.is_active = true
  )
  OR auth.uid() = user_id
  OR public.is_mixologist_group_member(auth.uid(), group_id)
);

-- Allow public read access to batch_productions for recipes with active QR codes
DROP POLICY IF EXISTS "Anyone can view productions with active QR codes" ON public.batch_productions;
CREATE POLICY "Anyone can view productions with active QR codes" 
ON public.batch_productions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.batch_qr_codes 
    WHERE batch_qr_codes.recipe_id::uuid = batch_productions.recipe_id 
    AND batch_qr_codes.is_active = true
  )
  OR auth.uid() = user_id
  OR public.is_mixologist_group_member(auth.uid(), group_id)
);