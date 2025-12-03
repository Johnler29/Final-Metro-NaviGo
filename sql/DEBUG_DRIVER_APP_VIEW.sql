-- DEBUG: See exactly what the driver app should see
-- This mimics the exact queries the app makes

-- ============================================
-- What the App Loads: All Assignments (no filter)
-- ============================================
-- The app loads ALL assignments first, then filters in code
SELECT 
  'All Assignments (App Loads These)' AS view_type,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.driver_id::text AS driver_id_text,
  dba.bus_id,
  dba.is_active,
  d.name AS driver_name,
  d.id AS driver_id_from_drivers,
  d.id::text AS driver_id_from_drivers_text,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  b.driver_id::text AS bus_driver_id_text,
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text THEN '✅ App WILL find this'
    WHEN dba.is_active != true THEN '❌ App filters this out (is_active != true)'
    WHEN dba.driver_id::text != d.id::text THEN '❌ App filters this out (driver_id mismatch)'
    ELSE '❓ Unknown'
  END AS app_result
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id::text = dba.driver_id::text
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY d.name, b.bus_number;

-- ============================================
-- What the App Finds: Active Assignments Only
-- ============================================
-- The app filters to: is_active === true AND driver_id matches
SELECT 
  'Active Assignments (App Finds These)' AS view_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.bus_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text THEN '✅ App WILL use this'
    ELSE '❌ App will NOT use this'
  END AS app_result
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.name, b.bus_number;

-- ============================================
-- Check Specific Driver (Replace with your driver name)
-- ============================================
SELECT 
  'Specific Driver Check' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  d.id::text AS driver_id_text,
  -- Check assignments
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.driver_id::text AS assignment_driver_id_text,
  dba.is_active,
  dba.bus_id,
  -- Check bus
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  b.driver_id::text AS bus_driver_id_text,
  b.status AS bus_status,
  -- Matching logic
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT - App shows N/A'
    WHEN dba.is_active != true THEN '❌ is_active is not true - App filters this out'
    WHEN dba.driver_id::text != d.id::text THEN '❌ driver_id mismatch - App filters this out'
    WHEN dba.bus_id != b.id THEN '❌ bus_id mismatch'
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.bus_id = b.id THEN '✅ PERFECT - App should show bus'
    ELSE '❓ Unknown issue'
  END AS app_result,
  -- What the app will display
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.bus_id = b.id AND b.bus_number IS NOT NULL 
    THEN b.bus_number
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.bus_id = b.id AND b.name IS NOT NULL 
    THEN b.name
    ELSE 'N/A'
  END AS what_app_will_show
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'  -- CHANGE THIS to your driver's name
   OR d.email LIKE '%paul%martinez%'
ORDER BY dba.assigned_at DESC NULLS LAST;

-- ============================================
-- Fix: Ensure Assignment is Active and IDs Match
-- ============================================
-- Run this to fix any issues found above
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
FROM drivers d
INNER JOIN buses b ON b.driver_id::text = d.id::text
WHERE dba.driver_id::text = d.id::text
  AND dba.bus_id = b.id
  AND (dba.is_active != true OR dba.is_active IS NULL)
RETURNING 
  '✅ Fixed' AS action,
  d.name AS driver_name,
  b.bus_number,
  dba.is_active;

-- ============================================
-- Create Missing Assignments
-- ============================================
INSERT INTO driver_bus_assignments (driver_id, bus_id, is_active, assigned_at)
SELECT 
  b.driver_id,
  b.id AS bus_id,
  true AS is_active,
  NOW() AS assigned_at
FROM buses b
INNER JOIN drivers d ON d.id::text = b.driver_id::text
WHERE b.driver_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM driver_bus_assignments dba 
    WHERE dba.driver_id::text = b.driver_id::text 
      AND dba.bus_id = b.id
  )
RETURNING 
  '✅ Created' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;

