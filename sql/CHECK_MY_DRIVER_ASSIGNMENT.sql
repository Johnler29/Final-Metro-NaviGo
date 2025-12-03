-- CHECK: See exactly what assignment exists for a specific driver
-- Replace 'Paul Martinez' with your driver's name, or use the driver_id directly

-- ============================================
-- Option 1: Check by Driver Name
-- ============================================
SELECT 
  'Driver Assignment Check' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  d.email,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.bus_id AS assignment_bus_id,
  dba.is_active,
  dba.assigned_at,
  dba.unassigned_at,
  -- Check if IDs match
  CASE 
    WHEN d.id::text = b.driver_id::text THEN '✅ Driver ID matches bus'
    ELSE '❌ Driver ID does NOT match bus'
  END AS driver_bus_match,
  CASE 
    WHEN d.id::text = dba.driver_id::text THEN '✅ Driver ID matches assignment'
    ELSE '❌ Driver ID does NOT match assignment'
  END AS driver_assignment_match,
  CASE 
    WHEN b.id = dba.bus_id THEN '✅ Bus ID matches assignment'
    ELSE '❌ Bus ID does NOT match assignment'
  END AS bus_assignment_match,
  -- Overall status
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT RECORD EXISTS'
    WHEN dba.is_active != true THEN '🚫 Assignment exists but is_active is NOT true'
    WHEN d.id::text != b.driver_id::text THEN '⚠️ Bus has different driver_id'
    WHEN d.id::text != dba.driver_id::text THEN '⚠️ Assignment has different driver_id'
    WHEN b.id != dba.bus_id THEN '⚠️ Assignment has different bus_id'
    WHEN dba.is_active = true AND d.id::text = b.driver_id::text AND d.id::text = dba.driver_id::text AND b.id = dba.bus_id THEN '✅ PERFECT - Should work!'
    ELSE '❓ Unknown issue'
  END AS overall_status
FROM drivers d
LEFT JOIN buses b ON b.driver_id::text = d.id::text
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text 
  AND dba.bus_id = b.id
WHERE d.name = 'Paul Martinez'  -- CHANGE THIS to your driver's name
   OR d.email LIKE '%paul%martinez%';  -- Or search by email

-- ============================================
-- Option 2: Check by Driver ID (if you know it)
-- ============================================
-- Uncomment and replace 'YOUR_DRIVER_ID_HERE' with the actual driver ID
/*
SELECT 
  'Driver Assignment Check by ID' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  dba.id AS assignment_id,
  dba.is_active,
  CASE 
    WHEN dba.is_active = true THEN '✅ Should work'
    ELSE '❌ Problem: is_active is not true'
  END AS status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text AND dba.is_active = true
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE d.id::text = 'YOUR_DRIVER_ID_HERE';
*/

-- ============================================
-- Option 3: Show ALL active assignments (to see what driver app should find)
-- ============================================
SELECT 
  'All Active Assignments' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  '✅ Driver app WILL find this' AS driver_app_result
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.name;

