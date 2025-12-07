-- Add INSERT policy for exam_categories to allow authenticated users to create categories
CREATE POLICY "Authenticated users can create exam categories" 
ON public.exam_categories 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add UPDATE policy for exam_categories
CREATE POLICY "Users can update their own exam categories" 
ON public.exam_categories 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for exam_categories
CREATE POLICY "Users can delete their own exam categories" 
ON public.exam_categories 
FOR DELETE 
USING (auth.uid() IS NOT NULL);