-- ROOT CAUSE FIX: Based on past changes, the admin portal creates assignments
-- but they might fail silently or be overridden by database constraints/triggers

-- ============================================
-- STEP 1: Check for Database Issues
-- ============================================
-- Check if there's a unique constraint on driver_id,bus_id
SELECT 
  'Unique Constraints' AS check_type,
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'driver_bus_assignments'
  AND constraint_type IN ('UNIQUE', 'PRIMARY KEY');

-- Check column defaults
SELECT 
  'Column Defaults' AS check_type,
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'driver_bus_assignments'
  AND column_name IN ('is_active', 'unassigned_at');

-- ============================================
-- STEP 2: Check Current Assignments
-- ============================================
SELECT 
  'Current Assignments' AS check_type,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  dba.unassigned_at,
  dba.assigned_at,
  d.name AS driver_name,
  b.bus_number,
  CASE 
    WHEN dba.is_active = true AND dba.unassigned_at IS NULL THEN '✅ Should work'
    ELSE '❌ Problem'
  END AS status
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id::text = dba.driver_id::text
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY dba.assigned_at DESC;

-- ============================================
-- STEP 3: FIX - Ensure All Assignments Are Active
-- ============================================
-- This will fix ALL assignments to be active and clear unassigned_at
UPDATE driver_bus_assignments
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
WHERE is_active IS NULL 
   OR is_active = false 
   OR is_active != true
   OR unassigned_at IS NOT NULL
RETURNING 
  '✅ Fixed' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active,
  unassigned_at;

-- ============================================
-- STEP 4: FIX - Create Missing Assignments for All Buses with Drivers
-- ============================================
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
  '✅ Created' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;

-- ============================================
-- STEP 5: Final Verification
-- ============================================
SELECT 
  'Final Check' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  b.bus_number,
  dba.id AS assignment_id,
  dba.is_active,
  dba.unassigned_at,
  CASE 
    WHEN dba.is_active = true AND dba.unassigned_at IS NULL THEN '✅ App will find this'
    ELSE '❌ App will NOT find this'
  END AS app_result
FROM buses b
INNER JOIN drivers d ON d.id::text = b.driver_id::text
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
ORDER BY d.created_at DESC;

