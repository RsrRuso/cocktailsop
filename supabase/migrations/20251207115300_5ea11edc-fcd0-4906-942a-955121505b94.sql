-- Add sort_order column to exam_questions table
ALTER TABLE public.exam_questions 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;