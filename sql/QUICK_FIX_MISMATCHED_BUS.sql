-- QUICK FIX: Find and fix the mismatched bus assignment
-- Run this after the diagnostic shows a mismatch

-- ============================================
-- STEP 1: Identify the exact mismatched bus
-- ============================================
SELECT 
  '🚨 MISMATCHED BUS' AS status,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT RECORD'
    WHEN dba.is_active = false THEN '🚫 is_active = FALSE'
    WHEN dba.is_active IS NULL THEN '⚠️ is_active = NULL'
    ELSE '❓ Unknown issue'
  END AS problem
FROM buses b
INNER JOIN drivers d ON d.id = b.driver_id
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = b.driver_id 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
  AND (dba.id IS NULL OR dba.is_active != true OR dba.is_active IS NULL)
ORDER BY d.name, b.bus_number;

-- ============================================
-- STEP 2: Fix - Activate existing inactive assignments
-- ============================================
-- Run this if assignment exists but is_active = false or NULL
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
  '✅ Activated Assignment' AS action,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active;

-- ============================================
-- STEP 3: Fix - Create missing assignments
-- ============================================
-- Run this if no assignment record exists
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
  '✅ Created Assignment' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;

-- ============================================
-- STEP 4: Verify the fix worked
-- ============================================
SELECT 
  '✅ Verification' AS status,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL THEN b.id END) AS buses_with_driver_id,
  COUNT(DISTINCT CASE WHEN dba.is_active = true THEN dba.id END) AS active_assignments,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true) THEN b.id END) AS mismatched_buses,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND (dba.id IS NULL OR dba.is_active != true) THEN b.id END) = 0 
    THEN '✅ ALL FIXED - No mismatches'
    ELSE '❌ Still has mismatches'
  END AS result
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = b.driver_id 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL;

