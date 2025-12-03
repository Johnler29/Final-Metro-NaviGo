-- QUICK MONITOR: Bus Status Changes
-- Copy and paste these queries into Supabase SQL Editor
-- Refresh to see real-time changes

-- ============================================
-- QUICK CHECK: What buses should be visible?
-- ============================================
SELECT 
  b.id,
  b.name AS bus_name,
  b.status AS bus_status,
  d.name AS driver_name,
  d.status AS driver_status,
  CASE 
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' THEN '✅ VISIBLE on map'
    ELSE '🚫 HIDDEN from map'
  END AS visibility,
  b.updated_at AS last_change
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY b.updated_at DESC;

-- ============================================
-- QUICK CHECK: Recent status changes (last hour)
-- ============================================
SELECT 
  b.id,
  b.name AS bus_name,
  b.status,
  b.driver_id,
  d.name AS driver_name,
  b.updated_at,
  EXTRACT(EPOCH FROM (NOW() - b.updated_at)) / 60 AS minutes_ago
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY b.updated_at DESC;

-- ============================================
-- QUICK CHECK: Count summary
-- ============================================
SELECT 
  'Active with Driver (VISIBLE)' AS category,
  COUNT(*) AS count
FROM buses b
INNER JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active' AND d.status = 'active'

UNION ALL

SELECT 
  'Inactive (HIDDEN)' AS category,
  COUNT(*) AS count
FROM buses
WHERE status = 'inactive' OR driver_id IS NULL

UNION ALL

SELECT 
  'Active but No Driver (HIDDEN)' AS category,
  COUNT(*) AS count
FROM buses
WHERE status = 'active' AND driver_id IS NULL;

