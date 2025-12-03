-- FIX ALL: Fix all missing or inactive assignments
-- This will ensure all buses with driver_id have active assignment records

-- ============================================
-- STEP 1: Check What Needs Fixing
-- ============================================
SELECT 
  'Issues Found' AS step,
  COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.id IS NULL) AS missing_assignments,
  COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active = false) AS inactive_assignments,
  COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active IS NULL) AS null_assignments
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.bus_id = b.id AND dba.driver_id = b.driver_id
WHERE b.driver_id IS NOT NULL;

-- ============================================
-- STEP 2: Activate Inactive Assignments
-- ============================================
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM buses b 
  WHERE b.id = dba.bus_id 
    AND b.driver_id = dba.driver_id
    AND b.driver_id IS NOT NULL
)
AND (dba.is_active = false OR dba.is_active IS NULL)
RETURNING 
  'Activated' AS action,
  dba.id,
  dba.driver_id,
  dba.bus_id;

-- ============================================
-- STEP 3: Create Missing Assignments
-- ============================================
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
  'Created' AS action,
  id,
  driver_id,
  bus_id;

-- ============================================
-- STEP 4: Verify All Fixed
-- ============================================
SELECT 
  'Verification' AS step,
  COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.id IS NULL) AS still_missing,
  COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active = false) AS still_inactive,
  COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active = true) AS active_assignments,
  CASE 
    WHEN COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.id IS NULL) = 0 
     AND COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active = false) = 0 
    THEN '✅ ALL FIXED'
    ELSE '⚠️ Some issues remain'
  END AS status
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.bus_id = b.id AND dba.driver_id = b.driver_id
WHERE b.driver_id IS NOT NULL;

-- ============================================
-- STEP 5: Show Final State
-- ============================================
SELECT 
  d.name AS driver_name,
  b.bus_number,
  b.name AS bus_name,
  dba.is_active AS assignment_active,
  b.status AS bus_status,
  CASE 
    WHEN dba.is_active = true AND b.status = 'inactive' THEN '✅ Assigned (off duty)'
    WHEN dba.is_active = true AND b.status = 'active' THEN '🟢 On duty'
    ELSE '❌ Issue'
  END AS status_description
FROM buses b
INNER JOIN drivers d ON d.id = b.driver_id
LEFT JOIN driver_bus_assignments dba ON dba.bus_id = b.id AND dba.driver_id = b.driver_id
WHERE b.driver_id IS NOT NULL
ORDER BY d.name, b.bus_number;

