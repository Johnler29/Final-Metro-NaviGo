-- VERIFY AND FIX: Comprehensive check and fix for assignment issues
-- This script verifies the fix worked and checks for common issues

-- ============================================
-- STEP 1: Check Current State
-- ============================================
SELECT 
  'Current State Check' AS check_type,
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
  dba.bus_id AS assignment_bus_id,
  dba.is_active,
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT'
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.bus_id = b.id THEN '✅ PERFECT MATCH'
    WHEN dba.is_active != true THEN '🚫 is_active is not TRUE'
    WHEN dba.driver_id::text != d.id::text THEN '⚠️ driver_id mismatch'
    WHEN dba.bus_id != b.id THEN '⚠️ bus_id mismatch'
    ELSE '❓ Unknown issue'
  END AS status
FROM buses b
INNER JOIN drivers d ON d.id = b.driver_id
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
ORDER BY d.name, b.bus_number;

-- ============================================
-- STEP 2: Check for Type Mismatches
-- ============================================
-- Sometimes driver_id is stored as text in one place and UUID in another
SELECT 
  'Type Check' AS check_type,
  d.id AS driver_id,
  pg_typeof(d.id) AS driver_id_type,
  b.driver_id AS bus_driver_id,
  pg_typeof(b.driver_id) AS bus_driver_id_type,
  dba.driver_id AS assignment_driver_id,
  pg_typeof(dba.driver_id) AS assignment_driver_id_type,
  CASE 
    WHEN d.id::text = b.driver_id::text AND d.id::text = dba.driver_id::text THEN '✅ Types match'
    WHEN d.id::text = b.driver_id::text AND dba.driver_id IS NULL THEN '⚠️ No assignment to compare'
    ELSE '❌ Type mismatch detected'
  END AS type_status
FROM buses b
INNER JOIN drivers d ON d.id = b.driver_id
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
LIMIT 5;

-- ============================================
-- STEP 3: Fix All Issues at Once
-- ============================================
-- This will:
-- 1. Activate inactive assignments
-- 2. Create missing assignments
-- 3. Fix any type mismatches

-- 3a. Activate inactive assignments
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
FROM buses b
INNER JOIN drivers d ON d.id = b.driver_id
WHERE dba.bus_id = b.id
  AND dba.driver_id::text = d.id::text
  AND b.driver_id IS NOT NULL
  AND (dba.is_active = false OR dba.is_active IS NULL)
RETURNING 
  '✅ Activated' AS action,
  dba.id AS assignment_id,
  d.name AS driver_name,
  b.bus_number;

-- 3b. Create missing assignments (for buses with driver_id but no assignment)
INSERT INTO driver_bus_assignments (driver_id, bus_id, is_active, assigned_at)
SELECT 
  b.driver_id,
  b.id AS bus_id,
  true AS is_active,
  NOW() AS assigned_at
FROM buses b
INNER JOIN drivers d ON d.id = b.driver_id
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
  bus_id;

-- ============================================
-- STEP 4: Final Verification
-- ============================================
SELECT 
  'Final Verification' AS check_type,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL THEN b.id END) AS buses_with_driver,
  COUNT(DISTINCT CASE WHEN dba.is_active = true AND dba.driver_id::text = b.driver_id::text THEN dba.id END) AS active_matching_assignments,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true OR dba.driver_id::text != b.driver_id::text) THEN b.id END) AS remaining_issues,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true OR dba.driver_id::text != b.driver_id::text) THEN b.id END) = 0 
    THEN '✅ ALL FIXED'
    ELSE '❌ Still has issues - check individual buses below'
  END AS result
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = b.driver_id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL;

-- ============================================
-- STEP 5: Show What Driver App Should See
-- ============================================
-- This mimics exactly what the driver app queries
SELECT 
  'Driver App View' AS view_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.bus_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text THEN '✅ Driver app WILL find this'
    ELSE '❌ Driver app will NOT find this'
  END AS driver_app_result
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.name, b.bus_number;

