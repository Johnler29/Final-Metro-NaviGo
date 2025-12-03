-- QUICK CHECK: Fast overview of assignment status
-- Run this for a quick snapshot of the current state

-- ============================================
-- Quick Status Dashboard
-- ============================================
SELECT 
  '📊 Assignment Status' AS section,
  COUNT(DISTINCT dba.id) AS total_assignments,
  COUNT(DISTINCT CASE WHEN dba.is_active = true THEN dba.id END) AS active_assignments,
  COUNT(DISTINCT CASE WHEN dba.is_active = false THEN dba.id END) AS inactive_assignments
FROM driver_bus_assignments dba

UNION ALL

SELECT 
  '🚌 Bus Status' AS section,
  COUNT(DISTINCT b.id) AS total_buses,
  COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END) AS buses_on_duty,
  COUNT(DISTINCT CASE WHEN b.status = 'inactive' AND b.driver_id IS NOT NULL THEN b.id END) AS buses_assigned_off_duty
FROM buses b

UNION ALL

SELECT 
  '⚠️ Issues' AS section,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND dba.id IS NULL THEN b.id END) AS missing_assignments,
  COUNT(DISTINCT CASE WHEN b.driver_id IS NOT NULL AND dba.is_active = false THEN b.id END) AS inactive_assignments,
  0 AS placeholder
FROM buses b
LEFT JOIN driver_bus_assignments dba ON dba.bus_id = b.id AND dba.driver_id = b.driver_id;

-- ============================================
-- Current Assignments (Detailed)
-- ============================================
SELECT 
  d.name AS driver,
  b.bus_number,
  b.name AS bus_name,
  CASE WHEN dba.is_active = true THEN '✅' ELSE '❌' END AS assignment,
  CASE WHEN b.status = 'active' THEN '🟢 On Duty' ELSE '⚪ Off Duty' END AS bus_status,
  dba.assigned_at::date AS assigned_date
FROM driver_bus_assignments dba
LEFT JOIN drivers d ON d.id = dba.driver_id
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
ORDER BY d.name;

