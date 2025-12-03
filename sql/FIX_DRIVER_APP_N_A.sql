-- FIX: Driver App Shows "N/A" for Current Bus
-- This script fixes all issues that cause the app to show N/A

-- ============================================
-- STEP 1: Check Current State for All Drivers
-- ============================================
SELECT 
  'Current State' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  d.id::text AS driver_id_text,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  b.driver_id::text AS bus_driver_id_text,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.driver_id::text AS assignment_driver_id_text,
  dba.is_active,
  dba.bus_id AS assignment_bus_id,
  -- Check what app will see
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT - App shows N/A'
    WHEN dba.is_active IS NULL THEN '❌ is_active is NULL - App filters out'
    WHEN dba.is_active = false THEN '❌ is_active is false - App filters out'
    WHEN dba.is_active != true THEN '❌ is_active is not true - App filters out'
    WHEN dba.driver_id::text != d.id::text THEN '❌ driver_id mismatch - App filters out'
    WHEN dba.bus_id != b.id THEN '❌ bus_id mismatch'
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.bus_id = b.id THEN '✅ PERFECT - App will show bus'
    ELSE '❓ Unknown issue'
  END AS app_result
FROM buses b
INNER JOIN drivers d ON d.id::text = b.driver_id::text
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
ORDER BY d.name, b.bus_number;

-- ============================================
-- STEP 2: Fix ALL Issues at Once
-- ============================================

-- 2a. Fix inactive assignments (set is_active = true)
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
FROM buses b
INNER JOIN drivers d ON d.id::text = b.driver_id::text
WHERE dba.bus_id = b.id
  AND dba.driver_id::text = d.id::text
  AND b.driver_id IS NOT NULL
  AND (dba.is_active IS NULL OR dba.is_active = false OR dba.is_active != true)
RETURNING 
  '✅ Fixed: Activated assignment' AS action,
  d.name AS driver_name,
  b.bus_number,
  dba.id AS assignment_id,
  dba.is_active;

-- 2b. Create missing assignments
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
  '✅ Created: New assignment' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;

-- 2c. Fix any assignments with wrong driver_id (shouldn't happen, but just in case)
UPDATE driver_bus_assignments dba
SET 
  driver_id = b.driver_id,
  updated_at = NOW()
FROM buses b
WHERE dba.bus_id = b.id
  AND b.driver_id IS NOT NULL
  AND dba.driver_id::text != b.driver_id::text
RETURNING 
  '✅ Fixed: Corrected driver_id' AS action,
  dba.id AS assignment_id,
  dba.driver_id AS old_driver_id,
  b.driver_id AS new_driver_id;

-- ============================================
-- STEP 3: Verify Fix Worked
-- ============================================
SELECT 
  'Verification' AS check_type,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL THEN b.id END) AS buses_with_driver,
  COUNT(DISTINCT CASE WHEN dba.is_active = true AND dba.driver_id::text = b.driver_id::text THEN dba.id END) AS active_matching_assignments,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true OR dba.driver_id::text != b.driver_id::text) THEN b.id END) AS remaining_issues,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true OR dba.driver_id::text != b.driver_id::text) THEN b.id END) = 0 
    THEN '✅ ALL FIXED - App should now show bus numbers'
    ELSE '❌ Still has issues - check individual buses'
  END AS result
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = b.driver_id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL;

-- ============================================
-- STEP 4: Show What App Should See Now
-- ============================================
SELECT 
  'What App Will Show' AS view_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text THEN 
      COALESCE(b.bus_number, b.name, 'Bus')
    ELSE 'N/A'
  END AS app_will_display
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.name, b.bus_number;

