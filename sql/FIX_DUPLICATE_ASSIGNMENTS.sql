-- FIX: Remove duplicate assignments
-- Duplicate assignments can cause the mobile app to not find the correct assignment

-- ============================================
-- STEP 1: Find Duplicate Assignments
-- ============================================
SELECT 
  driver_id,
  bus_id,
  COUNT(*) AS duplicate_count,
  STRING_AGG(id::text, ', ') AS assignment_ids,
  STRING_AGG(is_active::text, ', ') AS is_active_values,
  STRING_AGG(assigned_at::text, ', ') AS assigned_dates
FROM driver_bus_assignments
GROUP BY driver_id, bus_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================
-- STEP 2: Keep Only the Most Recent Active Assignment
-- ============================================
-- This will deactivate or delete older duplicate assignments
WITH ranked_assignments AS (
  SELECT 
    id,
    driver_id,
    bus_id,
    is_active,
    assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY driver_id, bus_id 
      ORDER BY 
        CASE WHEN is_active = true THEN 0 ELSE 1 END, -- Prefer active ones
        assigned_at DESC -- Then most recent
    ) AS rn
  FROM driver_bus_assignments
)
UPDATE driver_bus_assignments dba
SET 
  is_active = false,
  unassigned_at = NOW(),
  updated_at = NOW()
FROM ranked_assignments ra
WHERE dba.id = ra.id
  AND ra.rn > 1  -- Keep only the first (best) one
RETURNING 
  'Deactivated Duplicate' AS action,
  dba.id,
  dba.driver_id,
  dba.bus_id;

-- ============================================
-- STEP 3: Verify No More Duplicates
-- ============================================
SELECT 
  driver_id,
  bus_id,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ OK'
    WHEN COUNT(*) > 1 THEN '❌ Still has duplicates'
  END AS status
FROM driver_bus_assignments
WHERE is_active = true
GROUP BY driver_id, bus_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ============================================
-- STEP 4: Show Final State for Paul Martinez
-- ============================================
SELECT 
  d.name AS driver_name,
  b.bus_number,
  b.name AS bus_name,
  dba.id AS assignment_id,
  dba.is_active,
  dba.assigned_at,
  b.status AS bus_status,
  CASE 
    WHEN dba.is_active = true AND b.status = 'inactive' THEN '✅ Ready - App should find this'
    ELSE '❌ Issue'
  END AS status
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id = d.id AND dba.is_active = true
INNER JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Paul Martinez'
ORDER BY dba.assigned_at DESC;

