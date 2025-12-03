-- Check Status Constraints - See full definition and verify allowed values
-- This helps diagnose if constraints are blocking status updates

-- ============================================
-- 1. FULL CONSTRAINT DEFINITION FOR DRIVERS
-- ============================================
-- Get the complete constraint definition (not truncated)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS full_constraint_definition,
  CASE contype
    WHEN 'c' THEN 'CHECK constraint'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    ELSE 'Other'
  END AS constraint_type_name
FROM pg_constraint
WHERE conrelid = 'drivers'::regclass
  AND contype = 'c'
ORDER BY conname;

-- ============================================
-- 2. FULL CONSTRAINT DEFINITION FOR BUSES
-- ============================================
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS full_constraint_definition,
  CASE contype
    WHEN 'c' THEN 'CHECK constraint'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    ELSE 'Other'
  END AS constraint_type_name
FROM pg_constraint
WHERE conrelid = 'buses'::regclass
  AND contype = 'c'
ORDER BY conname;

-- ============================================
-- 3. TEST: Try to insert/update with different status values
-- ============================================
-- This will show you which values are actually allowed

-- Check what status values currently exist in drivers table
SELECT 
  status,
  COUNT(*) AS count,
  'Current values in database' AS note
FROM drivers
GROUP BY status
ORDER BY status;

-- Check what status values currently exist in buses table
SELECT 
  status,
  COUNT(*) AS count,
  'Current values in database' AS note
FROM buses
GROUP BY status
ORDER BY status;

-- ============================================
-- 4. VERIFY: Check if 'inactive' is allowed
-- ============================================
-- Test if we can update to 'inactive' (this won't actually update, just test)
SELECT 
  'Testing if inactive is allowed' AS test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM drivers WHERE status = 'inactive'
    ) THEN '✅ inactive status exists in database'
    ELSE '⚠️ No drivers with inactive status found'
  END AS inactive_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM buses WHERE status = 'inactive'
    ) THEN '✅ inactive status exists in database'
    ELSE '⚠️ No buses with inactive status found'
  END AS bus_inactive_check;

-- ============================================
-- 5. CHECK COLUMN DEFINITION
-- ============================================
-- See the exact column definition for status fields
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('drivers', 'buses')
  AND column_name = 'status'
ORDER BY table_name, column_name;

-- ============================================
-- 6. IF CONSTRAINT IS TOO RESTRICTIVE, HERE'S HOW TO FIX IT
-- ============================================
-- Only run this if the constraint is blocking valid updates

/*
-- Step 1: Drop the old constraint (if it's too restrictive)
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_status_check;

-- Step 2: Create a new constraint that allows: active, inactive, on_leave
ALTER TABLE drivers 
ADD CONSTRAINT drivers_status_check 
CHECK (status IN ('active', 'inactive', 'on_leave'));

-- Step 3: Do the same for buses if needed
ALTER TABLE buses DROP CONSTRAINT IF EXISTS buses_status_check;

ALTER TABLE buses 
ADD CONSTRAINT buses_status_check 
CHECK (status IN ('active', 'inactive'));
*/

-- ============================================
-- 7. QUICK CHECK: Current status values
-- ============================================
-- See what status values are currently being used
SELECT 
  'drivers' AS table_name,
  status,
  COUNT(*) AS count
FROM drivers
GROUP BY status

UNION ALL

SELECT 
  'buses' AS table_name,
  status,
  COUNT(*) AS count
FROM buses
GROUP BY status

ORDER BY table_name, status;

