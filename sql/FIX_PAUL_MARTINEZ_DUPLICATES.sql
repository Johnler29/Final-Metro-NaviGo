-- FIX: Paul Martinez has 3 duplicate active assignments to bus B001
-- This causes the app to show "N/A" because it can't determine which one to use

-- ============================================
-- STEP 1: See the Duplicates
-- ============================================
SELECT 
  'Duplicates Found' AS check_type,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  dba.assigned_at,
  d.name AS driver_name,
  b.bus_number,
  b.name AS bus_name,
  ROW_NUMBER() OVER (
    PARTITION BY dba.driver_id, dba.bus_id 
    ORDER BY 
      CASE WHEN dba.is_active = true THEN 0 ELSE 1 END,
      dba.assigned_at DESC
  ) AS row_num
FROM driver_bus_assignments dba
INNER JOIN drivers d ON d.id::text = dba.driver_id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'
  AND dba.is_active = true
ORDER BY dba.assigned_at DESC;

-- ============================================
-- STEP 2: Keep Only the Most Recent Active Assignment
-- ============================================
-- This will deactivate the older duplicate assignments
WITH ranked_assignments AS (
  SELECT 
    dba.id,
    dba.driver_id,
    dba.bus_id,
    dba.is_active,
    dba.assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY dba.driver_id, dba.bus_id 
      ORDER BY 
        CASE WHEN dba.is_active = true THEN 0 ELSE 1 END,
        dba.assigned_at DESC
    ) AS rn
  FROM driver_bus_assignments dba
  INNER JOIN drivers d ON d.id::text = dba.driver_id::text
  WHERE d.name = 'Paul Martinez'
)
UPDATE driver_bus_assignments dba
SET 
  is_active = false,
  unassigned_at = NOW(),
  updated_at = NOW()
FROM ranked_assignments ra
WHERE dba.id = ra.id
  AND ra.rn > 1  -- Keep only the first (most recent) one
RETURNING 
  '✅ Deactivated Duplicate' AS action,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active;

-- ============================================
-- STEP 3: Verify Only One Active Assignment Remains
-- ============================================
SELECT 
  'Verification' AS check_type,
  d.name AS driver_name,
  COUNT(*) AS total_assignments,
  COUNT(CASE WHEN dba.is_active = true THEN 1 END) AS active_assignments,
  STRING_AGG(dba.id::text, ', ') AS assignment_ids,
  CASE 
    WHEN COUNT(CASE WHEN dba.is_active = true THEN 1 END) = 1 THEN '✅ PERFECT - Only one active assignment'
    WHEN COUNT(CASE WHEN dba.is_active = true THEN 1 END) > 1 THEN '❌ Still has multiple active assignments'
    WHEN COUNT(CASE WHEN dba.is_active = true THEN 1 END) = 0 THEN '❌ No active assignments'
    ELSE '❓ Unknown state'
  END AS status
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'
GROUP BY d.id, d.name;

-- ============================================
-- STEP 4: Show Final State
-- ============================================
SELECT 
  'Final State' AS check_type,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  dba.assigned_at,
  CASE 
    WHEN dba.is_active = true THEN '✅ App will find this'
    ELSE '❌ App will NOT find this (inactive)'
  END AS app_result
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'
ORDER BY dba.is_active DESC, dba.assigned_at DESC;

