-- SQL script to update stop descriptions with detailed information
-- Run this in your Supabase SQL Editor
-- Make sure to replace 'YOUR_ROUTE_ID' or use the route_number filter

-- Update OPENING TICKET stop
UPDATE stops
SET 
  address = 'Robinson''s Place Dasmarinas, Dasmarinas City, Cavite - The point where the conductor opens the ticket booklet (start of trip)',
  updated_at = NOW()
WHERE 
  name = 'OPENING TICKET' 
  OR name ILIKE '%opening ticket%'
  OR name ILIKE '%opening%ticket%';

-- Update CARMONA EXIT stop
UPDATE stops
SET 
  address = 'SLEX Carmona Exit, Carmona, Cavite - Common checkpoint for Cavite-bound buses',
  updated_at = NOW()
WHERE 
  name = 'CARMONA EXIT' 
  OR name ILIKE '%carmona exit%'
  OR name ILIKE '%carmona%exit%';

-- Update CENTENNIAL stop
UPDATE stops
SET 
  address = 'Centennial Road, Cavite - Centennial area in GMA/Carmona corridor',
  updated_at = NOW()
WHERE 
  name = 'CENTENNIAL' 
  OR name ILIKE '%centennial%';

-- Update EASTWOOD stop
UPDATE stops
SET 
  address = 'Eastwood City / Libis, Quezon City - Major stop on C5 (Commonwealth Avenue)',
  updated_at = NOW()
WHERE 
  name = 'EASTWOOD' 
  OR name ILIKE '%eastwood%';

-- Update CUBAO stop
UPDATE stops
SET 
  address = 'Araneta City Bus Port, Cubao, Quezon City - Main terminal for Cubao-bound trips',
  updated_at = NOW()
WHERE 
  name = 'CUBAO' 
  OR name ILIKE '%cubao%';

-- Verify the updates
SELECT 
  name,
  address,
  latitude,
  longitude,
  sequence,
  route_id
FROM stops
WHERE 
  name IN ('OPENING TICKET', 'CARMONA EXIT', 'CENTENNIAL', 'EASTWOOD', 'CUBAO')
  OR name ILIKE '%opening%ticket%'
  OR name ILIKE '%carmona%exit%'
  OR name ILIKE '%centennial%'
  OR name ILIKE '%eastwood%'
  OR name ILIKE '%cubao%'
ORDER BY sequence;

