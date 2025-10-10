-- Update badge level for founder to platinum
UPDATE profiles 
SET badge_level = 'platinum' 
WHERE username = 'Russo_Str' AND is_founder = true;