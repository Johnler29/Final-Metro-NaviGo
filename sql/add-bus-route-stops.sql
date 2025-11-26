-- SQL script to add bus route stops based on the bus manifest
-- Run this in your Supabase SQL Editor

-- First, create the route (adjust route_number and details as needed)
-- This assumes you want to create a new route, or you can use an existing route_id

-- Option 1: Create a new route (uncomment and adjust if needed)
/*
INSERT INTO routes (route_number, name, description, origin, destination, estimated_duration, fare, status)
VALUES 
('R010', 'Dasmarinas - Cubao (Northbound)', 'Route from Dasmarinas to Cubao via Carmona, Centennial, and Eastwood', 
 'Dasmarinas', 'Cubao', 90, 50.00, 'active')
ON CONFLICT (route_number) DO NOTHING
RETURNING id;
*/

-- Option 2: Use existing route_id (replace 'YOUR_ROUTE_ID_HERE' with actual UUID)
-- Get your route_id first: SELECT id FROM routes WHERE route_number = 'R001';

-- Add stops for NORTH BOUND route
-- Note: "Opening Ticket" is assumed to be Dasmarinas Terminal/Starting Point
-- Adjust coordinates based on your exact stop locations

-- Stop 1: OPENING TICKET (Robinson's Dasmarinas Terminal)
-- The point where the conductor opens the ticket booklet (start of trip)
INSERT INTO stops (name, address, latitude, longitude, route_id, sequence, estimated_time_to_next, is_active)
VALUES 
(
  'OPENING TICKET',
  'Robinson''s Place Dasmarinas, Dasmarinas City, Cavite - The point where the conductor opens the ticket booklet (start of trip)',
  14.3290,  -- Robinson's Dasmarinas
  120.9367, -- Robinson's Dasmarinas
  (SELECT id FROM routes WHERE route_number = 'R010' LIMIT 1), -- Change to your route_id
  1,
  15, -- minutes to next stop
  true
)
ON CONFLICT DO NOTHING;

-- Stop 2: CARMONA EXIT
-- The SLEX Carmona Exit area - common checkpoint for Cavite-bound buses
INSERT INTO stops (name, address, latitude, longitude, route_id, sequence, estimated_time_to_next, is_active)
VALUES 
(
  'CARMONA EXIT',
  'SLEX Carmona Exit, Carmona, Cavite - Common checkpoint for Cavite-bound buses',
  14.3139,
  121.0575,
  (SELECT id FROM routes WHERE route_number = 'R010' LIMIT 1), -- Change to your route_id
  2,
  20, -- minutes to next stop
  true
)
ON CONFLICT DO NOTHING;

-- Stop 3: CENTENNIAL
-- Centennial Road (Cavite) or the Centennial area in GMA/Carmona corridor
INSERT INTO stops (name, address, latitude, longitude, route_id, sequence, estimated_time_to_next, is_active)
VALUES 
(
  'CENTENNIAL',
  'Centennial Road, Cavite - Centennial area in GMA/Carmona corridor',
  14.4795,
  120.8960,
  (SELECT id FROM routes WHERE route_number = 'R010' LIMIT 1), -- Change to your route_id
  3,
  25, -- minutes to next stop
  true
)
ON CONFLICT DO NOTHING;

-- Stop 4: EASTWOOD
-- Eastwood City / Libis, Quezon City - one of the major stops on C5
INSERT INTO stops (name, address, latitude, longitude, route_id, sequence, estimated_time_to_next, is_active)
VALUES 
(
  'EASTWOOD',
  'Eastwood City / Libis, Quezon City - Major stop on C5 (Commonwealth Avenue)',
  14.6091,
  121.0805,
  (SELECT id FROM routes WHERE route_number = 'R010' LIMIT 1), -- Change to your route_id
  4,
  15, -- minutes to next stop
  true
)
ON CONFLICT DO NOTHING;

-- Stop 5: CUBAO
-- Araneta City Bus Port - main terminal for Cubao-bound trips
INSERT INTO stops (name, address, latitude, longitude, route_id, sequence, estimated_time_to_next, is_active)
VALUES 
(
  'CUBAO',
  'Araneta City Bus Port, Cubao, Quezon City - Main terminal for Cubao-bound trips',
  14.6180,
  121.0560,
  (SELECT id FROM routes WHERE route_number = 'R010' LIMIT 1), -- Change to your route_id
  5,
  0, -- final stop
  true
)
ON CONFLICT DO NOTHING;

-- Verify the stops were added
SELECT 
  s.sequence,
  s.name,
  s.address,
  s.latitude,
  s.longitude,
  r.route_number,
  r.name as route_name
FROM stops s
JOIN routes r ON s.route_id = r.id
WHERE r.route_number = 'R010' -- Change to your route_number
ORDER BY s.sequence;

