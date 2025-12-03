-- FIX: Fix Paul Martinez's bus assignment
-- This will check and fix the assignment so the mobile app can find it

-- ============================================
-- STEP 1: Check Current State
-- ============================================
SELECT 
  'Current State' AS step,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  b.id AS bus_id,
  b.bus_number,
  b.driver_id AS bus_driver_id,
  CASE 
    WHEN dba.id IS NULL THEN '❌ No assignment record'
    WHEN dba.is_active = false THEN '🚫 Assignment inactive'
    WHEN dba.is_active IS NULL THEN '⚠️ Assignment is_active is NULL'
    WHEN dba.is_active = true THEN '✅ Assignment active'
    ELSE '❓ Unknown'
  END AS status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id
LEFT JOIN buses b ON b.driver_id = d.id OR b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'
ORDER BY dba.assigned_at DESC NULLS LAST;

-- ============================================
-- STEP 2: Fix Inactive Assignments
-- ============================================
-- Activate any assignments that are inactive
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
WHERE dba.driver_id = (SELECT id FROM drivers WHERE name = 'Paul Martinez' LIMIT 1)
  AND (dba.is_active = false OR dba.is_active IS NULL)
RETURNING 
  'Fixed Inactive Assignment' AS action,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active;

-- ============================================
-- STEP 3: Create Missing Assignment
-- ============================================
-- If bus has driver_id but no assignment record exists, create it
INSERT INTO driver_bus_assignments (driver_id, bus_id, is_active, assigned_at)
SELECT 
  d.id AS driver_id,
  b.id AS bus_id,
  true AS is_active,
  NOW() AS assigned_at
FROM drivers d
INNER JOIN buses b ON b.driver_id = d.id
WHERE d.name = 'Paul Martinez'
  AND NOT EXISTS (
    SELECT 1 FROM driver_bus_assignments dba 
    WHERE dba.driver_id = d.id AND dba.bus_id = b.id
  )
RETURNING 
  'Created Missing Assignment' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;

-- ============================================
-- STEP 4: Verify Fix
-- ============================================
SELECT 
  'Verification' AS step,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.status AS bus_status,
  CASE 
    WHEN dba.id IS NOT NULL AND dba.is_active = true AND b.id IS NOT NULL THEN '✅ FIXED - App should now find the bus'
    WHEN dba.id IS NOT NULL AND dba.is_active = true AND b.id IS NULL THEN '⚠️ Assignment active but bus not found'
    WHEN dba.id IS NULL THEN '❌ Still no assignment - check if bus has driver_id'
    ELSE '❓ Check manually'
  END AS fix_status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id AND dba.is_active = true
LEFT JOIN buses b ON b.id = dba.bus_id OR (b.driver_id = d.id AND dba.id IS NULL)
WHERE d.name = 'Paul Martinez';

