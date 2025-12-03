-- CHECK: Verify new driver assignment is set up correctly
-- Run this to see what's wrong with the new driver's assignment

-- ============================================
-- STEP 1: Check All Current Drivers
-- ============================================
SELECT 
  'Current Drivers' AS check_type,
  id AS driver_id,
  name AS driver_name,
  email,
  license_number,
  status AS driver_status,
  created_at
FROM drivers
ORDER BY created_at DESC;

-- ============================================
-- STEP 2: Check All Assignments
-- ============================================
SELECT 
  'All Assignments' AS check_type,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.driver_id::text AS driver_id_text,
  dba.bus_id,
  dba.is_active,
  dba.assigned_at,
  d.name AS driver_name,
  d.id AS driver_id_from_drivers,
  d.id::text AS driver_id_from_drivers_text,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id AS bus_driver_id,
  b.driver_id::text AS bus_driver_id_text,
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT EXISTS'
    WHEN dba.is_active IS NULL THEN '❌ is_active is NULL'
    WHEN dba.is_active = false THEN '❌ is_active is false'
    WHEN dba.is_active != true THEN '❌ is_active is not true'
    WHEN dba.driver_id::text != d.id::text THEN '❌ driver_id mismatch'
    WHEN dba.bus_id != b.id THEN '❌ bus_id mismatch'
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text AND dba.bus_id = b.id THEN '✅ PERFECT'
    ELSE '❓ Unknown issue'
  END AS status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
LEFT JOIN buses b ON b.id = dba.bus_id OR b.driver_id::text = d.id::text
ORDER BY d.created_at DESC, dba.assigned_at DESC NULLS LAST;

-- ============================================
-- STEP 3: Check Buses with Driver Assignments
-- ============================================
SELECT 
  'Buses with Drivers' AS check_type,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id,
  b.driver_id::text AS bus_driver_id_text,
  d.id AS driver_id_from_drivers,
  d.id::text AS driver_id_from_drivers_text,
  d.name AS driver_name,
  CASE 
    WHEN b.driver_id IS NULL THEN '❌ Bus has no driver_id'
    WHEN d.id IS NULL THEN '❌ Driver not found'
    WHEN b.driver_id::text = d.id::text THEN '✅ Driver ID matches'
    ELSE '❌ Driver ID mismatch'
  END AS status
FROM buses b
LEFT JOIN drivers d ON d.id::text = b.driver_id::text
WHERE b.driver_id IS NOT NULL
ORDER BY b.bus_number;

-- ============================================
-- STEP 4: Check if Assignment Exists for Bus with Driver
-- ============================================
SELECT 
  'Assignment Check' AS check_type,
  b.id AS bus_id,
  b.bus_number,
  b.driver_id AS bus_driver_id,
  d.name AS driver_name,
  d.id AS driver_id,
  dba.id AS assignment_id,
  dba.is_active,
  CASE 
    WHEN dba.id IS NULL THEN '❌ NO ASSIGNMENT - Need to create one'
    WHEN dba.is_active != true THEN '❌ Assignment exists but is_active is not true'
    WHEN dba.is_active = true THEN '✅ Assignment exists and is active'
    ELSE '❓ Unknown'
  END AS status
FROM buses b
INNER JOIN drivers d ON d.id::text = b.driver_id::text
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text 
  AND dba.bus_id = b.id
WHERE b.driver_id IS NOT NULL
ORDER BY b.bus_number;

-- ============================================
-- STEP 5: FIX - Create Missing Assignments
-- ============================================
-- This will create assignments for buses that have driver_id but no assignment record
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
  '✅ Created Assignment' AS action,
  id AS assignment_id,
  driver_id,
  bus_id,
  is_active;

-- ============================================
-- STEP 6: FIX - Activate Inactive Assignments
-- ============================================
-- This will activate any assignments that exist but are inactive
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
  '✅ Activated Assignment' AS action,
  dba.id AS assignment_id,
  d.name AS driver_name,
  b.bus_number,
  dba.is_active;

-- ============================================
-- STEP 7: Final Verification
-- ============================================
SELECT 
  'Final Verification' AS check_type,
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN dba.is_active = true AND dba.driver_id::text = d.id::text THEN '✅ App will find this'
    ELSE '❌ App will NOT find this'
  END AS app_result
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.created_at DESC;

