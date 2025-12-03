-- DIAGNOSE: Check why Paul Martinez shows "No Bus Assigned"
-- Run this to see exactly what's in the database for this driver

-- ============================================
-- 1. Check Driver Record
-- ============================================
SELECT 
  'Driver Record' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  d.email,
  d.status AS driver_status,
  d.license_number
FROM drivers d
WHERE d.name = 'Paul Martinez' OR d.email LIKE '%paul%martinez%';

-- ============================================
-- 2. Check Bus Assignment Record
-- ============================================
SELECT 
  'Assignment Record' AS check_type,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  dba.assigned_at,
  dba.unassigned_at,
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT RECORD EXISTS'
    WHEN dba.is_active = false THEN '🚫 Assignment exists but is_active = FALSE'
    WHEN dba.is_active IS NULL THEN '⚠️ Assignment exists but is_active = NULL'
    WHEN dba.is_active = true THEN '✅ Assignment exists and is_active = TRUE'
    ELSE '❓ Unknown state'
  END AS assignment_status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id
WHERE d.name = 'Paul Martinez' OR d.email LIKE '%paul%martinez%';

-- ============================================
-- 3. Check Bus Record
-- ============================================
SELECT 
  'Bus Record' AS check_type,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id,
  b.status AS bus_status,
  b.tracking_status,
  CASE 
    WHEN b.driver_id IS NULL THEN '❌ Bus has NO driver_id'
    WHEN b.driver_id != (SELECT id FROM drivers WHERE name = 'Paul Martinez' LIMIT 1) THEN '⚠️ Bus has different driver_id'
    WHEN b.driver_id = (SELECT id FROM drivers WHERE name = 'Paul Martinez' LIMIT 1) THEN '✅ Bus has correct driver_id'
    ELSE '❓ Check manually'
  END AS bus_driver_status
FROM buses b
WHERE b.driver_id = (SELECT id FROM drivers WHERE name = 'Paul Martinez' LIMIT 1)
   OR b.id IN (SELECT bus_id FROM driver_bus_assignments WHERE driver_id = (SELECT id FROM drivers WHERE name = 'Paul Martinez' LIMIT 1));

-- ============================================
-- 4. Complete Picture - What Mobile App Should See
-- ============================================
-- This mimics what the mobile app query does
SELECT 
  'Mobile App Query Result' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.bus_id,
  dba.is_active,
  b.id AS bus_id_from_bus_table,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  b.status AS bus_status,
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT - App will show "No Bus Assigned"'
    WHEN dba.is_active = false THEN '🚫 Assignment inactive - App will NOT find it (filters by is_active=true)'
    WHEN dba.is_active IS NULL THEN '⚠️ Assignment is_active is NULL - App will NOT find it'
    WHEN dba.is_active = true AND b.id IS NULL THEN '⚠️ Assignment active but bus not found'
    WHEN dba.is_active = true AND b.id IS NOT NULL THEN '✅ SHOULD WORK - Assignment active and bus exists'
    ELSE '❓ Unknown'
  END AS mobile_app_result
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id AND dba.is_active = true
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez' OR d.email LIKE '%paul%martinez%';

-- ============================================
-- 5. Fix: Activate Assignment if it exists but is inactive
-- ============================================
-- Uncomment and run this if assignment exists but is_active is false/NULL
/*
UPDATE driver_bus_assignments
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
WHERE driver_id = (SELECT id FROM drivers WHERE name = 'Paul Martinez' LIMIT 1)
  AND (is_active = false OR is_active IS NULL)
RETURNING *;
*/

-- ============================================
-- 6. Fix: Create Assignment if it doesn't exist
-- ============================================
-- Uncomment and run this if no assignment record exists but bus has driver_id
/*
INSERT INTO driver_bus_assignments (driver_id, bus_id, is_active, assigned_at)
SELECT 
  d.id AS driver_id,
  b.id AS bus_id,
  true AS is_active,
  NOW() AS assigned_at
FROM drivers d
CROSS JOIN buses b
WHERE d.name = 'Paul Martinez'
  AND b.driver_id = d.id
  AND NOT EXISTS (
    SELECT 1 FROM driver_bus_assignments dba 
    WHERE dba.driver_id = d.id AND dba.bus_id = b.id
  )
RETURNING *;
*/

