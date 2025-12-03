-- CHECK: Verify the bus from the assignment actually exists
-- The error "multiple (or no) rows returned" suggests the bus might not exist

-- ============================================
-- STEP 1: Check if the bus exists
-- ============================================
SELECT 
  'Bus Existence Check' AS check_type,
  '333adec1-ae03-45c5-b009-37ec2df42bf2' AS bus_id_to_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM buses WHERE id = '333adec1-ae03-45c5-b009-37ec2df42bf2') THEN '✅ Bus EXISTS'
    ELSE '❌ Bus DOES NOT EXIST'
  END AS status;

-- ============================================
-- STEP 2: Show the bus details if it exists
-- ============================================
SELECT 
  'Bus Details' AS check_type,
  id AS bus_id,
  bus_number,
  name AS bus_name,
  driver_id,
  status,
  route_id,
  created_at,
  updated_at
FROM buses
WHERE id = '333adec1-ae03-45c5-b009-37ec2df42bf2';

-- ============================================
-- STEP 3: Check all buses with assignments
-- ============================================
SELECT 
  'All Buses with Assignments' AS check_type,
  dba.bus_id,
  b.id AS bus_exists,
  b.bus_number,
  b.name AS bus_name,
  b.driver_id,
  b.status,
  CASE 
    WHEN b.id IS NULL THEN '❌ Bus DOES NOT EXIST'
    ELSE '✅ Bus exists'
  END AS status
FROM driver_bus_assignments dba
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY dba.assigned_at DESC;

-- ============================================
-- STEP 4: Find orphaned assignments (assignments to non-existent buses)
-- ============================================
SELECT 
  'Orphaned Assignments' AS check_type,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  d.name AS driver_name,
  CASE 
    WHEN b.id IS NULL THEN '❌ PROBLEM: Bus does not exist'
    ELSE '✅ Bus exists'
  END AS status
FROM driver_bus_assignments dba
INNER JOIN drivers d ON d.id::text = dba.driver_id::text
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
  AND b.id IS NULL;

