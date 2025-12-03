-- DIAGNOSE: Why "No Bus Assigned" on driver app but shows assigned on admin portal
-- This script identifies the exact mismatch between admin portal and driver app views

-- ============================================
-- ROOT CAUSE ANALYSIS
-- ============================================
-- Admin Portal shows assignments based on:
--   1. buses.driver_id (directly from buses table)
--   2. driver_bus_assignments (ALL records, regardless of is_active)
--
-- Driver App shows assignments based on:
--   1. driver_bus_assignments WHERE is_active = true ONLY
--
-- This mismatch causes the issue!

-- ============================================
-- 1. Check All Buses with Driver Assignments
-- ============================================
-- This shows what the admin portal sees (buses.driver_id)
SELECT 
  'Admin Portal View (buses.driver_id)' AS view_type,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  d.name AS driver_name,
  d.id AS driver_id,
  CASE 
    WHEN b.driver_id IS NOT NULL THEN '✅ Admin shows: ASSIGNED'
    ELSE '❌ Admin shows: NOT ASSIGNED'
  END AS admin_status
FROM buses b
LEFT JOIN drivers d ON d.id = b.driver_id
WHERE b.driver_id IS NOT NULL
ORDER BY b.bus_number;

-- ============================================
-- 2. Check All Active Assignments
-- ============================================
-- This shows what the driver app sees (is_active = true)
SELECT 
  'Driver App View (is_active = true)' AS view_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.bus_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN dba.is_active = true THEN '✅ Driver app shows: ASSIGNED'
    WHEN dba.is_active = false THEN '❌ Driver app shows: NOT ASSIGNED (inactive)'
    WHEN dba.is_active IS NULL THEN '❌ Driver app shows: NOT ASSIGNED (NULL)'
    ELSE '❓ Unknown'
  END AS driver_app_status
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id = d.id
INNER JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.name, b.bus_number;

-- ============================================
-- 3. FIND THE MISMATCH: Buses with driver_id but NO active assignment
-- ============================================
-- This is the exact problem - admin shows assigned, driver app doesn't
SELECT 
  '🚨 MISMATCH FOUND' AS issue_type,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id,
  d.name AS driver_name,
  d.id AS driver_id,
  dba.id AS assignment_id,
  dba.is_active AS assignment_is_active,
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT RECORD - Need to create one'
    WHEN dba.is_active = false THEN '🚫 Assignment exists but is_active = FALSE - Need to activate'
    WHEN dba.is_active IS NULL THEN '⚠️ Assignment exists but is_active = NULL - Need to set to TRUE'
    ELSE '✅ Should work'
  END AS problem,
  CASE 
    WHEN dba.id IS NULL THEN 'Create new assignment with is_active = true'
    WHEN dba.is_active = false OR dba.is_active IS NULL THEN 'Update assignment: SET is_active = true'
    ELSE 'No action needed'
  END AS fix_action
FROM buses b
INNER JOIN drivers d ON d.id = b.driver_id
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = b.driver_id 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
  AND (dba.id IS NULL OR dba.is_active != true OR dba.is_active IS NULL)
ORDER BY d.name, b.bus_number;

-- ============================================
-- 4. Check Specific Driver (Paul Martinez)
-- ============================================
SELECT 
  'Paul Martinez Specific Check' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  dba.id AS assignment_id,
  dba.is_active,
  CASE 
    WHEN b.driver_id = d.id AND dba.id IS NULL THEN '❌ Bus has driver_id but NO assignment record'
    WHEN b.driver_id = d.id AND dba.is_active = false THEN '🚫 Bus has driver_id but assignment is_active = FALSE'
    WHEN b.driver_id = d.id AND dba.is_active IS NULL THEN '⚠️ Bus has driver_id but assignment is_active = NULL'
    WHEN b.driver_id = d.id AND dba.is_active = true THEN '✅ Should work - both match'
    WHEN b.driver_id != d.id AND dba.is_active = true THEN '⚠️ Assignment active but bus.driver_id doesn''t match'
    ELSE '❓ Unknown state'
  END AS status,
  CASE 
    WHEN b.driver_id = d.id AND (dba.id IS NULL OR dba.is_active != true) THEN 'FIX NEEDED'
    ELSE 'OK'
  END AS action_required
FROM drivers d
LEFT JOIN buses b ON b.driver_id = d.id
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id 
  AND dba.bus_id = b.id
WHERE d.name = 'Paul Martinez' OR d.email LIKE '%paul%martinez%'
ORDER BY b.bus_number;

-- ============================================
-- 5. Summary Statistics
-- ============================================
SELECT 
  'Summary' AS section,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL THEN b.id END) AS buses_with_driver_id,
  COUNT(DISTINCT CASE WHEN dba.is_active = true THEN dba.id END) AS active_assignments,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true) THEN b.id END) AS mismatched_buses,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true) THEN b.id END) > 0 
    THEN '❌ MISMATCH DETECTED - Run fix script'
    ELSE '✅ All assignments match'
  END AS status
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = b.driver_id 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL;

-- ============================================
-- 6. FIX: Activate Inactive Assignments
-- ============================================
-- Uncomment and run this to fix assignments that exist but are inactive
/*
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
FROM buses b
WHERE dba.bus_id = b.id
  AND dba.driver_id = b.driver_id
  AND b.driver_id IS NOT NULL
  AND (dba.is_active = false OR dba.is_active IS NULL)
RETURNING 
  'Activated Assignment' AS action,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active;
*/

-- ============================================
-- 7. FIX: Create Missing Assignments
-- ============================================
-- Uncomment and run this to create assignments for buses that have driver_id but no assignment record
/*
INSERT INTO driver_bus_assignments (driver_id, bus_id, is_active, assigned_at)
SELECT 
  b.driver_id,
  b.id AS bus_id,
  true AS is_active,
  NOW() AS assigned_at
FROM buses b
WHERE b.driver_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM driver_bus_assignments dba 
    WHERE dba.driver_id = b.driver_id 
      AND dba.bus_id = b.id
  )
RETURNING 
  'Created Assignment' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;
*/

