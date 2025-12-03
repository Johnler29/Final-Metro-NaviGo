-- COMPREHENSIVE FIX: Fix all assignment issues based on past changes
-- This addresses the root cause: admin portal creates assignments but they might not be active

-- ============================================
-- STEP 1: Check Current State
-- ============================================
SELECT 
  'Current State' AS check_type,
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
  -- Check all possible issues
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT RECORD'
    WHEN dba.is_active IS NULL THEN '❌ is_active is NULL'
    WHEN dba.is_active = false THEN '❌ is_active is false'
    WHEN dba.is_active != true THEN '❌ is_active is not true'
    WHEN dba.driver_id::text != d.id::text THEN '❌ driver_id mismatch'
    WHEN dba.bus_id != b.id THEN '❌ bus_id mismatch'
    WHEN dba.unassigned_at IS NOT NULL THEN '⚠️ unassigned_at is set (should be NULL)'
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.bus_id = b.id AND dba.unassigned_at IS NULL THEN '✅ PERFECT'
    ELSE '❓ Unknown issue'
  END AS status
FROM buses b
INNER JOIN drivers d ON d.id::text = b.driver_id::text
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
ORDER BY d.created_at DESC, b.bus_number;

-- ============================================
-- STEP 2: Fix ALL Issues at Once
-- ============================================

-- 2a. Create missing assignments
INSERT INTO driver_bus_assignments (driver_id, bus_id, is_active, assigned_at, unassigned_at)
SELECT 
  b.driver_id,
  b.id AS bus_id,
  true AS is_active,
  COALESCE(b.updated_at, NOW()) AS assigned_at,
  NULL AS unassigned_at
FROM buses b
INNER JOIN drivers d ON d.id::text = b.driver_id::text
WHERE b.driver_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM driver_bus_assignments dba 
    WHERE dba.driver_id::text = b.driver_id::text 
      AND dba.bus_id = b.id
  )
RETURNING 
  '✅ Created Assignment' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;

-- 2b. Fix inactive assignments (set is_active = true, clear unassigned_at)
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
  AND (dba.is_active IS NULL OR dba.is_active = false OR dba.is_active != true OR dba.unassigned_at IS NOT NULL)
RETURNING 
  '✅ Fixed Assignment' AS action,
  dba.id AS assignment_id,
  d.name AS driver_name,
  b.bus_number,
  dba.is_active,
  dba.unassigned_at;

-- 2c. Fix driver_id mismatches (shouldn't happen, but just in case)
UPDATE driver_bus_assignments dba
SET 
  driver_id = b.driver_id,
  updated_at = NOW()
FROM buses b
WHERE dba.bus_id = b.id
  AND b.driver_id IS NOT NULL
  AND dba.driver_id::text != b.driver_id::text
RETURNING 
  '✅ Fixed driver_id' AS action,
  dba.id AS assignment_id,
  dba.driver_id AS old_driver_id,
  b.driver_id AS new_driver_id;

-- ============================================
-- STEP 3: Verify Fix
-- ============================================
SELECT 
  'Verification' AS check_type,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL THEN b.id END) AS buses_with_driver,
  COUNT(DISTINCT CASE WHEN dba.is_active = true AND dba.driver_id::text = b.driver_id::text AND dba.bus_id = b.id AND dba.unassigned_at IS NULL THEN dba.id END) AS perfect_assignments,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true OR dba.driver_id::text != b.driver_id::text OR dba.unassigned_at IS NOT NULL) THEN b.id END) AS remaining_issues,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true OR dba.driver_id::text != b.driver_id::text OR dba.unassigned_at IS NOT NULL) THEN b.id END) = 0 
    THEN '✅ ALL FIXED'
    ELSE '❌ Still has issues'
  END AS result
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = b.driver_id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL;

-- ============================================
-- STEP 4: Show What Driver App Will See
-- ============================================
SELECT 
  'Driver App View' AS view_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  dba.unassigned_at,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.unassigned_at IS NULL THEN 
      COALESCE(b.bus_number, b.name, 'Bus')
    ELSE 'N/A'
  END AS app_will_display
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.created_at DESC;

-- ============================================
-- STEP 5: Check for Database Constraints/Triggers
-- ============================================
-- Check if there's a default value or trigger setting is_active to false
SELECT 
  'Table Constraints' AS check_type,
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'driver_bus_assignments'
  AND column_name = 'is_active';

-- Check for triggers that might modify is_active
SELECT 
  'Triggers' AS check_type,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'driver_bus_assignments';

