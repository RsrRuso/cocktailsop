-- Remove duplicate venues (keep the first occurrence of each venue name)
DELETE FROM public.venues a
USING public.venues b
WHERE a.id > b.id 
AND a.name = b.name;

-- Add Attiko Dubai
INSERT INTO public.venues (name, type, region, city, address) VALUES
('Attiko', 'bar', 'Dubai', 'Dubai', 'The St. Regis Dubai, The Palm')
ON CONFLICT DO NOTHING;