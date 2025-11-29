-- Add produced_by_user_id column to link batch productions to registered users
ALTER TABLE public.batch_productions
ADD COLUMN produced_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_batch_productions_produced_by_user ON public.batch_productions(produced_by_user_id);

-- Update RLS policies to allow viewing productions by user_id
CREATE POLICY "Users can view productions where they are the producer"
ON public.batch_productions
FOR SELECT
USING (
  auth.uid() = produced_by_user_id
  OR auth.uid() = user_id
  OR (group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), group_id))
);