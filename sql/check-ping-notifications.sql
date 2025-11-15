-- Check Ping Notifications in Database
-- Run these queries in Supabase SQL Editor to view ping data

-- ========================================
-- 1. View All Ping Notifications
-- ========================================
SELECT 
  pn.id,
  pn.user_id,
  au.email AS user_email,
  pn.bus_id,
  b.bus_number,
  b.name AS bus_name,
  pn.ping_type,
  pn.message,
  pn.status,
  pn.location_latitude,
  pn.location_longitude,
  pn.location_address,
  pn.created_at,
  pn.acknowledged_at,
  pn.completed_at,
  pn.updated_at
FROM ping_notifications pn
LEFT JOIN auth.users au ON pn.user_id = au.id
LEFT JOIN buses b ON pn.bus_id = b.id
ORDER BY pn.created_at DESC
LIMIT 50;

-- ========================================
-- 2. View Recent Pings (Last 24 Hours)
-- ========================================
SELECT 
  pn.id,
  au.email AS user_email,
  b.bus_number,
  pn.ping_type,
  pn.message,
  pn.status,
  pn.created_at,
  CASE 
    WHEN pn.status = 'pending' THEN '⏳ Pending'
    WHEN pn.status = 'acknowledged' THEN '✅ Acknowledged'
    WHEN pn.status = 'completed' THEN '✔️ Completed'
    WHEN pn.status = 'cancelled' THEN '❌ Cancelled'
    ELSE pn.status
  END AS status_display
FROM ping_notifications pn
LEFT JOIN auth.users au ON pn.user_id = au.id
LEFT JOIN buses b ON pn.bus_id = b.id
WHERE pn.created_at > NOW() - INTERVAL '24 hours'
ORDER BY pn.created_at DESC;

-- ========================================
-- 3. View Pings by Status
-- ========================================
SELECT 
  pn.status,
  COUNT(*) AS count,
  COUNT(CASE WHEN pn.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) AS last_24h
FROM ping_notifications pn
GROUP BY pn.status
ORDER BY count DESC;

-- ========================================
-- 4. View Pings by Type
-- ========================================
SELECT 
  pn.ping_type,
  COUNT(*) AS count,
  COUNT(CASE WHEN pn.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) AS last_24h
FROM ping_notifications pn
GROUP BY pn.ping_type
ORDER BY count DESC;

-- ========================================
-- 5. View User Ping Limits and Status
-- ========================================
SELECT 
  upl.user_id,
  au.email AS user_email,
  upl.pings_today,
  (50 - upl.pings_today) AS pings_remaining,
  upl.last_ping_at,
  upl.is_blocked,
  upl.blocked_until,
  CASE 
    WHEN upl.is_blocked AND upl.blocked_until > NOW() THEN 
      '🚫 Blocked until ' || upl.blocked_until::text
    WHEN upl.pings_today >= 50 THEN 
      '⚠️ Daily limit reached'
    WHEN upl.last_ping_at IS NOT NULL AND 
         NOW() - upl.last_ping_at < INTERVAL '30 seconds' THEN 
      '⏸️ In cooldown'
    ELSE 
      '✅ Can ping'
  END AS status
FROM user_ping_limits upl
LEFT JOIN auth.users au ON upl.user_id = au.id
ORDER BY upl.pings_today DESC, upl.last_ping_at DESC;

-- ========================================
-- 6. First, Get List of Buses with IDs
-- ========================================
SELECT 
  b.id AS bus_id,
  b.bus_number,
  b.name AS bus_name,
  COUNT(pn.id) AS ping_count
FROM buses b
LEFT JOIN ping_notifications pn ON b.id = pn.bus_id
GROUP BY b.id, b.bus_number, b.name
ORDER BY ping_count DESC;

-- ========================================
-- 6b. View Pings for a Specific Bus
-- ========================================
-- Replace the UUID below with an actual bus ID from the query above
-- Example: WHERE pn.bus_id = '123e4567-e89b-12d3-a456-426614174000'::uuid
SELECT 
  pn.id,
  au.email AS user_email,
  pn.ping_type,
  pn.message,
  pn.status,
  pn.location_latitude,
  pn.location_longitude,
  pn.created_at,
  pn.acknowledged_at,
  pn.completed_at
FROM ping_notifications pn
LEFT JOIN auth.users au ON pn.user_id = au.id
WHERE pn.bus_id = (SELECT id FROM buses LIMIT 1)  -- Change this to a specific bus ID
ORDER BY pn.created_at DESC;

-- ========================================
-- 7. First, Get List of Users with Ping Activity
-- ========================================
SELECT 
  au.id AS user_id,
  au.email AS user_email,
  COUNT(pn.id) AS ping_count,
  MAX(pn.created_at) AS last_ping_at
FROM auth.users au
LEFT JOIN ping_notifications pn ON au.id = pn.user_id
WHERE pn.id IS NOT NULL
GROUP BY au.id, au.email
ORDER BY ping_count DESC;

-- ========================================
-- 7b. View Pings for a Specific User
-- ========================================
-- Replace the UUID below with an actual user ID from the query above
-- Or use: WHERE au.email = 'user@example.com'
SELECT 
  pn.id,
  b.bus_number,
  b.name AS bus_name,
  pn.ping_type,
  pn.message,
  pn.status,
  pn.created_at,
  pn.acknowledged_at,
  pn.completed_at
FROM ping_notifications pn
LEFT JOIN buses b ON pn.bus_id = b.id
LEFT JOIN auth.users au ON pn.user_id = au.id
WHERE au.email = 'user@example.com'  -- Change this to a specific user email
ORDER BY pn.created_at DESC;

-- ========================================
-- 8. View Pending Pings (Not Yet Acknowledged)
-- ========================================
SELECT 
  pn.id,
  au.email AS user_email,
  b.bus_number,
  b.name AS bus_name,
  pn.ping_type,
  pn.message,
  pn.location_latitude,
  pn.location_longitude,
  pn.created_at,
  NOW() - pn.created_at AS age
FROM ping_notifications pn
LEFT JOIN auth.users au ON pn.user_id = au.id
LEFT JOIN buses b ON pn.bus_id = b.id
WHERE pn.status = 'pending'
ORDER BY pn.created_at ASC;

-- ========================================
-- 9. View Ping Statistics Summary
-- ========================================
SELECT 
  COUNT(*) AS total_pings,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) AS pings_last_24h,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) AS pings_last_7d,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_pings,
  COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) AS acknowledged_pings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_pings,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT bus_id) AS unique_buses
FROM ping_notifications;

-- ========================================
-- 10. View Most Active Pingers (Top Users)
-- ========================================
SELECT 
  pn.user_id,
  au.email AS user_email,
  COUNT(*) AS total_pings,
  COUNT(CASE WHEN pn.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) AS pings_today,
  MAX(pn.created_at) AS last_ping_at,
  upl.pings_today AS limit_pings_today,
  upl.is_blocked,
  upl.blocked_until
FROM ping_notifications pn
LEFT JOIN auth.users au ON pn.user_id = au.id
LEFT JOIN user_ping_limits upl ON pn.user_id = upl.user_id
GROUP BY pn.user_id, au.email, upl.pings_today, upl.is_blocked, upl.blocked_until
ORDER BY total_pings DESC
LIMIT 20;

-- ========================================
-- 11. View Buses with Most Pings
-- ========================================
SELECT 
  pn.bus_id,
  b.bus_number,
  b.name AS bus_name,
  COUNT(*) AS total_pings,
  COUNT(CASE WHEN pn.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) AS pings_today,
  COUNT(CASE WHEN pn.status = 'pending' THEN 1 END) AS pending_pings,
  MAX(pn.created_at) AS last_ping_at
FROM ping_notifications pn
LEFT JOIN buses b ON pn.bus_id = b.id
GROUP BY pn.bus_id, b.bus_number, b.name
ORDER BY total_pings DESC
LIMIT 20;

-- ========================================
-- 12. View Ping Activity Timeline (Last 7 Days)
-- ========================================
SELECT 
  DATE(pn.created_at) AS date,
  COUNT(*) AS ping_count,
  COUNT(DISTINCT pn.user_id) AS unique_users,
  COUNT(DISTINCT pn.bus_id) AS unique_buses
FROM ping_notifications pn
WHERE pn.created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(pn.created_at)
ORDER BY date DESC;

-- ========================================
-- 13. View Blocked Users
-- ========================================
SELECT 
  upl.user_id,
  au.email AS user_email,
  upl.pings_today,
  upl.is_blocked,
  upl.blocked_until,
  CASE 
    WHEN upl.blocked_until > NOW() THEN 
      EXTRACT(EPOCH FROM (upl.blocked_until - NOW())) / 3600 || ' hours remaining'
    ELSE 
      'Block expired'
  END AS block_status
FROM user_ping_limits upl
LEFT JOIN auth.users au ON upl.user_id = au.id
WHERE upl.is_blocked = true
ORDER BY upl.blocked_until DESC;

-- ========================================
-- 14. View Ping Response Times (Acknowledged Pings)
-- ========================================
SELECT 
  pn.id,
  au.email AS user_email,
  b.bus_number,
  pn.ping_type,
  pn.created_at,
  pn.acknowledged_at,
  EXTRACT(EPOCH FROM (pn.acknowledged_at - pn.created_at)) AS response_time_seconds,
  CASE 
    WHEN EXTRACT(EPOCH FROM (pn.acknowledged_at - pn.created_at)) < 60 THEN 
      '⚡ Fast (< 1 min)'
    WHEN EXTRACT(EPOCH FROM (pn.acknowledged_at - pn.created_at)) < 300 THEN 
      '✅ Good (< 5 min)'
    ELSE 
      '⏳ Slow (> 5 min)'
  END AS response_category
FROM ping_notifications pn
LEFT JOIN auth.users au ON pn.user_id = au.id
LEFT JOIN buses b ON pn.bus_id = b.id
WHERE pn.acknowledged_at IS NOT NULL
ORDER BY pn.acknowledged_at DESC
LIMIT 50;

-- ========================================
-- 15. Quick Count Check
-- ========================================
SELECT 
  'Total Pings' AS metric,
  COUNT(*)::text AS value
FROM ping_notifications
UNION ALL
SELECT 
  'Pending Pings',
  COUNT(*)::text
FROM ping_notifications
WHERE status = 'pending'
UNION ALL
SELECT 
  'Users with Limits',
  COUNT(*)::text
FROM user_ping_limits
UNION ALL
SELECT 
  'Blocked Users',
  COUNT(*)::text
FROM user_ping_limits
WHERE is_blocked = true;

