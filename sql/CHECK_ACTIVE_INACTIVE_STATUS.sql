-- CHECK: See if buses/drivers are active or inactive
-- Run this query anytime to see current status

-- ============================================
-- QUICK CHECK: Current Status Overview
-- ============================================
SELECT 
  'Buses' AS table_name,
  status,
  COUNT(*) AS count,
  CASE 
    WHEN status = 'active' THEN '✅ Active (visible on map)'
    WHEN status = 'inactive' THEN '🚫 Inactive (hidden from map)'
    ELSE '❓ Unknown'
  END AS meaning
FROM buses
GROUP BY status

UNION ALL

SELECT 
  'Drivers' AS table_name,
  status,
  COUNT(*) AS count,
  CASE 
    WHEN status = 'active' THEN '✅ Active (on duty)'
    WHEN status = 'inactive' THEN '🚫 Inactive (off duty)'
    ELSE '❓ Unknown'
  END AS meaning
FROM drivers
GROUP BY status

ORDER BY table_name, status;

-- ============================================
-- DETAILED CHECK: See each bus and driver
-- ============================================
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  CASE 
    WHEN b.status = 'active' THEN '✅ Active'
    WHEN b.status = 'inactive' THEN '🚫 Inactive'
    ELSE '❓ Unknown'
  END AS bus_status_indicator,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  CASE 
    WHEN d.status = 'active' THEN '✅ On Duty'
    WHEN d.status = 'inactive' THEN '🚫 Off Duty'
    ELSE '❓ Unknown'
  END AS driver_status_indicator,
  b.updated_at AS bus_last_update,
  d.updated_at AS driver_last_update,
  CASE 
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' THEN '✅ VISIBLE on map'
    ELSE '🚫 HIDDEN from map'
  END AS map_visibility
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY b.status, b.updated_at DESC;

-- ============================================
-- REAL-TIME MONITORING: Watch for changes
-- ============================================
-- Run this query repeatedly (every 5-10 seconds) to see live changes
SELECT 
  NOW() AS check_time,
  'Buses' AS type,
  status,
  COUNT(*) AS count
FROM buses
GROUP BY status

UNION ALL

SELECT 
  NOW() AS check_time,
  'Drivers' AS type,
  status,
  COUNT(*) AS count
FROM drivers
GROUP BY status

ORDER BY type, status;

-- ============================================
-- RECENT CHANGES: See what changed recently
-- ============================================
-- Shows buses/drivers that were updated in the last hour
SELECT 
  'Bus' AS entity_type,
  b.id,
  b.name,
  b.status,
  b.updated_at,
  EXTRACT(EPOCH FROM (NOW() - b.updated_at)) / 60 AS minutes_ago,
  CASE 
    WHEN b.updated_at > NOW() - INTERVAL '5 minutes' THEN '🟢 Very Recent'
    WHEN b.updated_at > NOW() - INTERVAL '30 minutes' THEN '🟡 Recent'
    ELSE '🔴 Old'
  END AS recency
FROM buses b
WHERE b.updated_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Driver' AS entity_type,
  d.id,
  d.name,
  d.status,
  d.updated_at,
  EXTRACT(EPOCH FROM (NOW() - d.updated_at)) / 60 AS minutes_ago,
  CASE 
    WHEN d.updated_at > NOW() - INTERVAL '5 minutes' THEN '🟢 Very Recent'
    WHEN d.updated_at > NOW() - INTERVAL '30 minutes' THEN '🟡 Recent'
    ELSE '🔴 Old'
  END AS recency
FROM drivers d
WHERE d.updated_at > NOW() - INTERVAL '1 hour'

ORDER BY updated_at DESC;

-- ============================================
-- SIMPLE STATUS CHECK (Easiest to use)
-- ============================================
-- Just copy and paste this one - it shows everything you need
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  d.name AS driver_name,
  d.status AS driver_status,
  CASE 
    WHEN b.status = 'active' AND d.status = 'active' THEN '✅ ACTIVE (visible)'
    WHEN b.status = 'inactive' OR d.status = 'inactive' THEN '🚫 INACTIVE (hidden)'
    ELSE '❓ Check manually'
  END AS current_state
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY b.status DESC, b.updated_at DESC;

