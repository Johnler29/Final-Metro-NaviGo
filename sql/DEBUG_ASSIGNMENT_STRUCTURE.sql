-- DEBUG: Check assignment structure to see why app can't find it
-- This shows exactly what data the app should receive

-- ============================================
-- 1. Check assignment structure (what app receives)
-- ============================================
-- This mimics what getDriverBusAssignments() returns
SELECT 
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  d.name AS driver_name,
  d.id AS driver_id_from_drivers_table,
  b.id AS bus_id_from_buses_table,
  b.name AS bus_name,
  b.bus_number,
  b.status AS bus_status,
  b.driver_id AS bus_driver_id,
  CASE 
    WHEN dba.driver_id = d.id THEN '✅ driver_id matches'
    ELSE '❌ driver_id mismatch'
  END AS driver_id_check,
  CASE 
    WHEN dba.bus_id = b.id THEN '✅ bus_id matches'
    ELSE '❌ bus_id mismatch'
  END AS bus_id_check
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY dba.assigned_at DESC;

-- ============================================
-- 2. Check specific driver (Paul Martinez)
-- ============================================
SELECT 
  'Driver Info' AS section,
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS driver_status
FROM drivers d
WHERE d.name = 'Paul Martinez'

UNION ALL

SELECT 
  'Assignment Info' AS section,
  dba.driver_id AS driver_id,
  d.name AS driver_name,
  dba.is_active::text AS driver_status
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
WHERE d.name = 'Paul Martinez'

UNION ALL

SELECT 
  'Bus Info' AS section,
  b.driver_id AS driver_id,
  b.name AS driver_name,
  b.status AS driver_status
FROM buses b
WHERE b.driver_id IN (
  SELECT id FROM drivers WHERE name = 'Paul Martinez'
);

-- ============================================
-- 3. Check if assignment matches driver
-- ============================================
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.driver_id AS assignment_driver_id,
  dba.bus_id AS assignment_bus_id,
  b.name AS bus_name,
  CASE 
    WHEN dba.driver_id = d.id THEN '✅ MATCH'
    ELSE '❌ NO MATCH'
  END AS match_status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id AND (dba.is_active = true OR dba.is_active IS NULL)
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez';

-- ============================================
-- 4. See all assignments with full details
-- ============================================
SELECT 
  dba.id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  d.id AS driver_table_id,
  d.name AS driver_name,
  b.id AS bus_table_id,
  b.name AS bus_name,
  b.bus_number,
  CASE 
    WHEN dba.driver_id = d.id AND dba.bus_id = b.id THEN '✅ All IDs match'
    WHEN dba.driver_id != d.id THEN '❌ Driver ID mismatch'
    WHEN dba.bus_id != b.id THEN '❌ Bus ID mismatch'
    ELSE '❓ Check manually'
  END AS validation
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
ORDER BY dba.assigned_at DESC;

