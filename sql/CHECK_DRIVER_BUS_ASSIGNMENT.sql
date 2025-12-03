-- CHECK: Why driver profile shows "N/A" for current bus
-- Run this to see if assignments exist in the database

-- ============================================
-- 1. Check driver_bus_assignments table
-- ============================================
SELECT 
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active AS assignment_active,
  d.name AS driver_name,
  b.name AS bus_name,
  b.bus_number,
  b.status AS bus_status,
  b.driver_id AS bus_driver_id,
  CASE 
    WHEN dba.id IS NOT NULL AND b.id IS NOT NULL THEN '✅ Assignment exists'
    WHEN dba.id IS NOT NULL AND b.id IS NULL THEN '⚠️ Assignment exists but bus not found'
    WHEN dba.id IS NULL AND b.driver_id IS NOT NULL THEN '⚠️ Bus has driver_id but no assignment record'
    ELSE '❌ No assignment'
  END AS assignment_status
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY dba.assigned_at DESC;

-- ============================================
-- 2. Check specific driver (Paul Martinez)
-- ============================================
-- Replace 'YOUR_DRIVER_ID' with actual driver ID
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  dba.id AS assignment_id,
  dba.bus_id AS assignment_bus_id,
  dba.is_active AS assignment_active,
  b.id AS bus_id,
  b.name AS bus_name,
  b.bus_number,
  b.status AS bus_status,
  b.driver_id AS bus_driver_id,
  CASE 
    WHEN dba.id IS NOT NULL AND b.id IS NOT NULL THEN '✅ Has assignment'
    WHEN dba.id IS NULL AND b.driver_id = d.id THEN '⚠️ Bus has driver_id but no assignment record'
    ELSE '❌ No assignment'
  END AS status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id AND dba.is_active = true
LEFT JOIN buses b ON b.id = dba.bus_id OR b.driver_id = d.id
WHERE d.name = 'Paul Martinez'  -- Change to your driver name
ORDER BY dba.assigned_at DESC NULLS LAST;

-- ============================================
-- 3. Check all drivers and their assignments
-- ============================================
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  COUNT(dba.id) AS assignment_count,
  STRING_AGG(b.name, ', ') AS assigned_buses,
  CASE 
    WHEN COUNT(dba.id) > 0 THEN '✅ Has assignment(s)'
    ELSE '❌ No assignments'
  END AS assignment_status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id AND (dba.is_active = true OR dba.is_active IS NULL)
LEFT JOIN buses b ON b.id = dba.bus_id
GROUP BY d.id, d.name, d.status
ORDER BY assignment_count DESC, d.name;

-- ============================================
-- 4. Fix: Create missing assignments from buses table
-- ============================================
-- If buses have driver_id but no assignment record, create the assignment
-- Only run this if you need to sync assignments

/*
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
RETURNING *;
*/

-- ============================================
-- 5. Check if assignments are active
-- ============================================
SELECT 
  dba.id,
  d.name AS driver_name,
  b.name AS bus_name,
  dba.is_active,
  dba.assigned_at,
  dba.unassigned_at,
  CASE 
    WHEN dba.is_active = true AND dba.unassigned_at IS NULL THEN '✅ Active assignment'
    WHEN dba.is_active = false OR dba.unassigned_at IS NOT NULL THEN '🚫 Inactive assignment'
    ELSE '❓ Unknown'
  END AS assignment_status
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY dba.assigned_at DESC;

