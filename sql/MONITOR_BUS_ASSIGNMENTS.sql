-- MONITOR: Real-time monitoring of bus assignments and status
-- Run this to see the current state of all driver-bus assignments
-- Shows if assignments exist, bus status, and whether driver is on duty

-- ============================================
-- 1. Complete Assignment Overview
-- ============================================
-- Shows all assignments with bus and driver status
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  dba.id AS assignment_id,
  dba.is_active AS assignment_active,
  dba.assigned_at,
  dba.unassigned_at,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.status AS bus_status,
  b.tracking_status,
  b.driver_id AS bus_driver_id,
  CASE 
    WHEN dba.id IS NULL THEN '❌ No assignment record'
    WHEN dba.is_active = false THEN '🚫 Assignment inactive'
    WHEN dba.is_active = true AND b.status = 'inactive' THEN '✅ Assigned (not on duty)'
    WHEN dba.is_active = true AND b.status = 'active' THEN '🟢 On Duty'
    ELSE '❓ Unknown state'
  END AS assignment_state,
  CASE 
    WHEN dba.driver_id = b.driver_id AND dba.driver_id = d.id THEN '✅ IDs match'
    WHEN dba.driver_id != b.driver_id THEN '⚠️ Assignment driver_id ≠ bus driver_id'
    WHEN dba.driver_id != d.id THEN '⚠️ Assignment driver_id ≠ driver id'
    ELSE '❌ ID mismatch'
  END AS id_consistency
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id
LEFT JOIN buses b ON b.id = dba.bus_id OR b.driver_id = d.id
WHERE b.driver_id IS NOT NULL OR dba.id IS NOT NULL
ORDER BY d.name, dba.assigned_at DESC NULLS LAST;

-- ============================================
-- 2. Quick Status Summary
-- ============================================
SELECT 
  COUNT(DISTINCT d.id) AS total_drivers,
  COUNT(DISTINCT dba.id) AS total_assignments,
  COUNT(DISTINCT CASE WHEN dba.is_active = true THEN dba.id END) AS active_assignments,
  COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END) AS buses_on_duty,
  COUNT(DISTINCT CASE WHEN b.status = 'inactive' AND b.driver_id IS NOT NULL THEN b.id END) AS buses_assigned_but_off_duty,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NULL THEN b.id END) AS buses_without_driver
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id
LEFT JOIN buses b ON b.id = dba.bus_id OR b.driver_id = d.id;

-- ============================================
-- 3. Drivers with Assignment Issues
-- ============================================
-- Shows drivers who should have assignments but don't, or have inactive assignments
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.status AS bus_status,
  dba.id AS assignment_id,
  dba.is_active AS assignment_active,
  CASE 
    WHEN b.driver_id = d.id AND dba.id IS NULL THEN '❌ Bus has driver_id but NO assignment record'
    WHEN b.driver_id = d.id AND dba.is_active = false THEN '🚫 Assignment exists but is INACTIVE'
    WHEN b.driver_id = d.id AND dba.is_active = true AND b.status = 'inactive' THEN '✅ Correct: Assigned but off duty'
    WHEN b.driver_id = d.id AND dba.is_active = true AND b.status = 'active' THEN '🟢 Correct: Assigned and on duty'
    ELSE '❓ Check manually'
  END AS issue_description
FROM drivers d
INNER JOIN buses b ON b.driver_id = d.id
LEFT JOIN driver_bus_assignments dba ON dba.driver_id = d.id AND dba.bus_id = b.id
WHERE dba.id IS NULL OR dba.is_active = false
ORDER BY d.name;

-- ============================================
-- 4. Buses with Assignment Issues
-- ============================================
-- Shows buses that have drivers but missing or inactive assignments
SELECT 
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  dba.id AS assignment_id,
  dba.is_active AS assignment_active,
  CASE 
    WHEN b.driver_id IS NOT NULL AND dba.id IS NULL THEN '❌ Missing assignment record'
    WHEN b.driver_id IS NOT NULL AND dba.is_active = false THEN '🚫 Assignment inactive'
    WHEN b.driver_id IS NOT NULL AND dba.is_active = true THEN '✅ Assignment OK'
    ELSE '❓ No driver assigned'
  END AS assignment_status
FROM buses b
LEFT JOIN drivers d ON d.id = b.driver_id
LEFT JOIN driver_bus_assignments dba ON dba.bus_id = b.id AND dba.driver_id = b.driver_id
WHERE b.driver_id IS NOT NULL
ORDER BY b.bus_number;

-- ============================================
-- 5. Recent Assignment Activity
-- ============================================
-- Shows assignments created/updated in the last 24 hours
SELECT 
  dba.id AS assignment_id,
  d.name AS driver_name,
  b.bus_number,
  b.name AS bus_name,
  dba.is_active,
  dba.assigned_at,
  dba.unassigned_at,
  b.status AS bus_status,
  CASE 
    WHEN dba.assigned_at > NOW() - INTERVAL '1 hour' THEN '🆕 Just assigned'
    WHEN dba.assigned_at > NOW() - INTERVAL '24 hours' THEN '📅 Recent'
    ELSE '📆 Older'
  END AS recency
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE dba.assigned_at > NOW() - INTERVAL '24 hours'
   OR dba.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY dba.assigned_at DESC;

-- ============================================
-- 6. Health Check Summary
-- ============================================
-- Quick health check - shows if everything is in sync
WITH assignment_check AS (
  SELECT 
    COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.id IS NULL) AS missing_assignments,
    COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active = false) AS inactive_assignments,
    COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active = true AND b.status = 'inactive') AS assigned_off_duty,
    COUNT(*) FILTER (WHERE b.driver_id IS NOT NULL AND dba.is_active = true AND b.status = 'active') AS assigned_on_duty
  FROM buses b
  LEFT JOIN driver_bus_assignments dba ON dba.bus_id = b.id AND dba.driver_id = b.driver_id
  WHERE b.driver_id IS NOT NULL
)
SELECT 
  CASE 
    WHEN missing_assignments > 0 THEN '❌ ' || missing_assignments || ' buses missing assignment records'
    ELSE '✅ All buses have assignment records'
  END AS assignment_records_status,
  CASE 
    WHEN inactive_assignments > 0 THEN '⚠️ ' || inactive_assignments || ' assignments are inactive'
    ELSE '✅ All assignments are active'
  END AS assignment_active_status,
  CASE 
    WHEN assigned_off_duty > 0 THEN '✅ ' || assigned_off_duty || ' drivers assigned but off duty (correct)'
    ELSE 'ℹ️ No drivers assigned but off duty'
  END AS off_duty_status,
  CASE 
    WHEN assigned_on_duty > 0 THEN '🟢 ' || assigned_on_duty || ' drivers on duty'
    ELSE 'ℹ️ No drivers currently on duty'
  END AS on_duty_status
FROM assignment_check;

