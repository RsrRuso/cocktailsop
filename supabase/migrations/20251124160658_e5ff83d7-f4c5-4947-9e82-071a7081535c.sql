-- Add area_allocation column to staff_members table
ALTER TABLE staff_members 
ADD COLUMN area_allocation TEXT CHECK (area_allocation IN ('indoor', 'outdoor')) DEFAULT 'indoor';