-- DELETE: Remove all driver records from the database
-- WARNING: This will delete ALL drivers and their related data
-- Make sure you have a backup before running this!

-- ============================================
-- STEP 1: Preview What Will Be Deleted
-- ============================================
SELECT 
  'Preview: Drivers to be Deleted' AS check_type,
  COUNT(*) AS total_drivers,
  COUNT(DISTINCT id) AS unique_driver_ids
FROM drivers;

-- Show all drivers that will be deleted
SELECT 
  'Drivers List' AS check_type,
  id AS driver_id,
  name AS driver_name,
  email,
  license_number,
  status,
  created_at
FROM drivers
ORDER BY created_at;

-- ============================================
-- STEP 2: Check Related Records
-- ============================================
-- Show assignments that will be affected
SELECT 
  'Related Assignments' AS check_type,
  COUNT(*) AS total_assignments,
  COUNT(CASE WHEN is_active = true THEN 1 END) AS active_assignments
FROM driver_bus_assignments;

-- Show buses that have driver_id set
SELECT 
  'Buses with Drivers' AS check_type,
  COUNT(*) AS buses_with_drivers
FROM buses
WHERE driver_id IS NOT NULL;

-- ============================================
-- STEP 3: Delete Related Records First
-- ============================================
-- Delete all driver-bus assignments
DELETE FROM driver_bus_assignments
RETURNING 
  '✅ Deleted Assignment' AS action,
  id AS assignment_id,
  driver_id,
  bus_id;

-- Clear driver_id from buses table
UPDATE buses
SET 
  driver_id = NULL,
  updated_at = NOW()
WHERE driver_id IS NOT NULL
RETURNING 
  '✅ Cleared driver_id from bus' AS action,
  id AS bus_id,
  bus_number,
  name AS bus_name;

-- ============================================
-- STEP 4: Delete All Drivers
-- ============================================
DELETE FROM drivers
RETURNING 
  '✅ Deleted Driver' AS action,
  id AS driver_id,
  name AS driver_name,
  email,
  license_number;

-- ============================================
-- STEP 5: Verify Deletion
-- ============================================
SELECT 
  'Verification' AS check_type,
  (SELECT COUNT(*) FROM drivers) AS remaining_drivers,
  (SELECT COUNT(*) FROM driver_bus_assignments) AS remaining_assignments,
  (SELECT COUNT(*) FROM buses WHERE driver_id IS NOT NULL) AS buses_with_drivers,
  CASE 
    WHEN (SELECT COUNT(*) FROM drivers) = 0 THEN '✅ All drivers deleted'
    ELSE '❌ Some drivers still exist'
  END AS status;

