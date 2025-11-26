-- SQL script to fix route deletion by adding CASCADE/SET NULL to foreign key constraints
-- This allows routes to be deleted even when they have associated stops, schedules, or buses
-- Run this in your Supabase SQL Editor

-- Drop the existing foreign key constraint on stops
ALTER TABLE stops 
DROP CONSTRAINT IF EXISTS stops_route_id_fkey;

-- Recreate the foreign key constraint with CASCADE delete
-- This means when a route is deleted, all associated stops will be automatically deleted
ALTER TABLE stops
ADD CONSTRAINT stops_route_id_fkey 
FOREIGN KEY (route_id) 
REFERENCES routes(id) 
ON DELETE CASCADE;

-- Drop and recreate schedules foreign key with CASCADE
ALTER TABLE schedules 
DROP CONSTRAINT IF EXISTS schedules_route_id_fkey;

ALTER TABLE schedules
ADD CONSTRAINT schedules_route_id_fkey 
FOREIGN KEY (route_id) 
REFERENCES routes(id) 
ON DELETE CASCADE;

-- Drop and recreate buses foreign key with SET NULL
-- This means when a route is deleted, buses will have their route_id set to NULL (not deleted)
ALTER TABLE buses 
DROP CONSTRAINT IF EXISTS buses_route_id_fkey;

ALTER TABLE buses
ADD CONSTRAINT buses_route_id_fkey 
FOREIGN KEY (route_id) 
REFERENCES routes(id) 
ON DELETE SET NULL;

-- Verify the constraints
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('stops', 'schedules', 'buses')
  AND tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'routes';

