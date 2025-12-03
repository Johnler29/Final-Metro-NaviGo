-- FIX: Activate assignments that should be active but aren't
-- This fixes the issue where admin website assigns drivers but is_active is false/NULL
-- Run this to fix existing assignments

-- ============================================
-- 1. Check current state of assignments
-- ============================================
SELECT 
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  d.name AS driver_name,
  b.name AS bus_name,
  b.bus_number,
  b.driver_id AS bus_driver_id,
  CASE 
    WHEN dba.is_active = true THEN '✅ Active'
    WHEN dba.is_active = false THEN '❌ Inactive (needs fix)'
    WHEN dba.is_active IS NULL THEN '⚠️ NULL (needs fix)'
    ELSE '❓ Unknown'
  END AS status
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE b.driver_id IS NOT NULL
ORDER BY dba.assigned_at DESC;

-- ============================================
-- 2. Fix: Activate assignments where bus has driver_id
-- ============================================
-- This activates assignments that should be active because:
-- - The bus has a driver_id assigned
-- - The assignment exists but is_active is false or NULL
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL, -- Clear unassigned_at if it was set
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM buses b 
  WHERE b.id = dba.bus_id 
    AND b.driver_id = dba.driver_id
    AND b.driver_id IS NOT NULL
)
AND (dba.is_active = false OR dba.is_active IS NULL)
RETURNING 
  dba.id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  '✅ Fixed' AS status;

-- ============================================
-- 3. Verify the fix
-- ============================================
SELECT 
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  d.name AS driver_name,
  b.name AS bus_name,
  b.bus_number,
  CASE 
    WHEN dba.is_active = true THEN '✅ Active'
    ELSE '❌ Still inactive'
  END AS status
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE b.driver_id IS NOT NULL
ORDER BY dba.assigned_at DESC;

