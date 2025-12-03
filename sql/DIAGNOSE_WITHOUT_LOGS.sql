-- DIAGNOSE: Check everything without needing app logs
-- This will show exactly what the app should see and why it might not work

-- ============================================
-- STEP 1: Check All Drivers and Their Assignments
-- ============================================
SELECT 
  'All Drivers & Assignments' AS check_type,
  d.id AS driver_id,
  d.id::text AS driver_id_text,
  d.name AS driver_name,
  d.email,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.driver_id::text AS assignment_driver_id_text,
  dba.bus_id,
  dba.is_active,
  dba.unassigned_at,
  b.bus_number,
  b.name AS bus_name,
  -- Check if everything matches
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT'
    WHEN dba.is_active != true THEN '❌ is_active is NOT true'
    WHEN dba.unassigned_at IS NOT NULL THEN '❌ unassigned_at is set'
    WHEN dba.driver_id::text != d.id::text THEN '❌ driver_id mismatch'
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.unassigned_at IS NULL THEN '✅ PERFECT'
    ELSE '❓ Check manually'
  END AS status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY d.created_at DESC;

-- ============================================
-- STEP 2: Check What the App Query Returns
-- ============================================
-- This mimics the exact query from lib/supabase.js getDriverBusAssignments()
SELECT 
  'App Query Result' AS check_type,
  dba.id,
  dba.driver_id,
  dba.driver_id::text AS driver_id_text,
  dba.bus_id,
  dba.is_active,
  dba.assigned_at,
  dba.unassigned_at,
  -- Joined driver (drivers:driver_id)
  d.id AS drivers_id,
  d.id::text AS drivers_id_text,
  d.name AS drivers_name,
  -- Joined bus (buses:bus_id)
  b.id AS buses_id,
  b.bus_number AS buses_bus_number,
  b.name AS buses_name,
  b.route_id AS buses_route_id,
  -- Check matching (what app does)
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text THEN '✅ App will match this'
    ELSE '❌ App will NOT match this'
  END AS app_will_match
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY dba.assigned_at DESC;

-- ============================================
-- STEP 3: Check for Common Issues
-- ============================================
SELECT 
  'Issue Check' AS check_type,
  'Multiple active assignments' AS issue_type,
  COUNT(*) AS count
FROM driver_bus_assignments
WHERE is_active = true
GROUP BY driver_id, bus_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 
  'Issue Check' AS check_type,
  'Assignments with unassigned_at set' AS issue_type,
  COUNT(*) AS count
FROM driver_bus_assignments
WHERE is_active = true AND unassigned_at IS NOT NULL

UNION ALL

SELECT 
  'Issue Check' AS check_type,
  'Buses with driver_id but no assignment' AS issue_type,
  COUNT(*) AS count
FROM buses b
WHERE b.driver_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM driver_bus_assignments dba 
    WHERE dba.driver_id::text = b.driver_id::text AND dba.bus_id = b.id
  )

UNION ALL

SELECT 
  'Issue Check' AS check_type,
  'Assignments with is_active = false' AS issue_type,
  COUNT(*) AS count
FROM driver_bus_assignments
WHERE is_active = false;

-- ============================================
-- STEP 4: Check Driver Session Data
-- ============================================
-- The app stores driver_id in AsyncStorage
-- This shows what driver_id values exist
SELECT 
  'Driver IDs in Database' AS check_type,
  id AS driver_id,
  id::text AS driver_id_text,
  name AS driver_name,
  email,
  'Use this ID to check in app' AS note
FROM drivers
ORDER BY created_at DESC;

-- ============================================
-- STEP 5: Verify Assignment for Specific Driver
-- ============================================
-- Replace 'Paul Martinez' with your driver's name
SELECT 
  'Specific Driver Check' AS check_type,
  d.id AS driver_id,
  d.id::text AS driver_id_text,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  dba.unassigned_at,
  b.bus_number,
  -- All matching conditions
  (dba.driver_id::text = d.id::text) AS driver_id_matches,
  (dba.is_active = true) AS is_active_true,
  (dba.unassigned_at IS NULL) AS unassigned_at_null,
  -- Final result
  CASE 
    WHEN dba.is_active = true 
      AND dba.driver_id::text = d.id::text 
      AND dba.unassigned_at IS NULL 
    THEN '✅ App SHOULD find this'
    ELSE '❌ App will NOT find this'
  END AS final_result
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text AND dba.is_active = true
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez';

