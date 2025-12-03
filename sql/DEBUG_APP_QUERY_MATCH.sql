-- DEBUG: Check if the app can match the assignment
-- This mimics exactly what the app query does

-- ============================================
-- STEP 1: What the App Query Returns
-- ============================================
-- This is the exact query the app runs (from lib/supabase.js)
SELECT 
  'App Query Result' AS check_type,
  dba.id,
  dba.driver_id,
  dba.driver_id::text AS driver_id_text,
  dba.bus_id,
  dba.is_active,
  dba.assigned_at,
  dba.unassigned_at,
  -- Joined driver data (drivers:driver_id)
  d.id AS drivers_id,
  d.id::text AS drivers_id_text,
  d.name AS drivers_name,
  -- Joined bus data (buses:bus_id)
  b.id AS buses_id,
  b.bus_number AS buses_bus_number,
  b.name AS buses_name,
  -- Check if IDs match (what app checks)
  CASE 
    WHEN dba.driver_id::text = d.id::text THEN '✅ driver_id matches drivers.id'
    ELSE '❌ driver_id does NOT match drivers.id'
  END AS id_match,
  -- Check is_active (what app checks)
  CASE 
    WHEN dba.is_active = true THEN '✅ is_active is true'
    ELSE '❌ is_active is NOT true'
  END AS active_check
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY dba.assigned_at DESC;

-- ============================================
-- STEP 2: Check Specific Driver (Paul Martinez)
-- ============================================
SELECT 
  'Paul Martinez Assignment' AS check_type,
  d.id AS driver_id,
  d.id::text AS driver_id_text,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.driver_id::text AS assignment_driver_id_text,
  dba.is_active,
  dba.unassigned_at,
  b.bus_number,
  b.name AS bus_name,
  -- Check all matching conditions the app uses
  CASE 
    WHEN dba.driver_id::text = d.id::text THEN '✅ match1: driver_id matches'
    ELSE '❌ match1: driver_id does NOT match'
  END AS match1,
  CASE 
    WHEN d.id::text = d.id::text THEN '✅ match2: drivers.id matches (always true)'
    ELSE '❌ match2: drivers.id does NOT match'
  END AS match2,
  CASE 
    WHEN dba.driver_id::text = d.id::text THEN '✅ match3: toString() matches'
    ELSE '❌ match3: toString() does NOT match'
  END AS match3,
  CASE 
    WHEN dba.is_active = true THEN '✅ is_active check passes'
    ELSE '❌ is_active check FAILS'
  END AS active_check,
  -- Overall result
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.unassigned_at IS NULL THEN '✅ App WILL find this'
    ELSE '❌ App will NOT find this'
  END AS app_result
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'
ORDER BY dba.assigned_at DESC NULLS LAST;

-- ============================================
-- STEP 3: Check Driver Session ID
-- ============================================
-- The app gets driver_id from AsyncStorage session
-- This shows what driver_id the app might be using
SELECT 
  'Driver IDs to Check' AS check_type,
  id AS driver_id,
  id::text AS driver_id_text,
  name AS driver_name,
  email,
  'Use this ID in app logs' AS note
FROM drivers
WHERE name = 'Paul Martinez'
ORDER BY created_at DESC;

-- ============================================
-- STEP 4: Test All Matching Strategies
-- ============================================
-- This tests all the matching strategies the app uses
SELECT 
  'Matching Test' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  -- Test match1: assignment.drivers?.id === driver.id
  (d.id = d.id) AS match1_result,
  -- Test match2: assignment.driver_id === driver.id
  (dba.driver_id = d.id) AS match2_result,
  -- Test match3: assignment.driver_id?.toString() === driver.id?.toString()
  (dba.driver_id::text = d.id::text) AS match3_result,
  -- Test match4: assignment.drivers?.id?.toString() === driver.id?.toString()
  (d.id::text = d.id::text) AS match4_result,
  -- is_active check
  (dba.is_active = true) AS is_active_check,
  -- Overall: will app find it?
  CASE 
    WHEN dba.is_active = true AND (dba.driver_id = d.id OR dba.driver_id::text = d.id::text) THEN '✅ App WILL find'
    ELSE '❌ App will NOT find'
  END AS final_result
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'
  AND dba.is_active = true;

