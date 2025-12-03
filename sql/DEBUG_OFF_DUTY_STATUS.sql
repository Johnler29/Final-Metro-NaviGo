-- DEBUG: Why isn't status changing when driver goes off duty?
-- Run these queries to diagnose the issue

-- ============================================
-- 1. CHECK CURRENT STATUS IN DATABASE
-- ============================================
-- See what the database actually shows right now
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  b.tracking_status,
  b.updated_at AS bus_last_updated,
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  d.updated_at AS driver_last_updated,
  CASE 
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' THEN '✅ Should be VISIBLE'
    WHEN b.status = 'inactive' OR b.driver_id IS NULL OR d.status = 'inactive' THEN '🚫 Should be HIDDEN'
    ELSE '❓ Unknown state'
  END AS expected_visibility
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY b.updated_at DESC;

-- ============================================
-- 2. CHECK IF UPDATE IS BEING BLOCKED
-- ============================================
-- Check RLS policies on buses table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'buses'
ORDER BY policyname;

-- Check RLS policies on drivers table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'drivers'
ORDER BY policyname;

-- ============================================
-- 3. CHECK RECENT UPDATES (Last 1 hour)
-- ============================================
-- See if any updates happened recently
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS current_bus_status,
  b.driver_id AS current_driver_id,
  b.updated_at AS bus_updated_at,
  EXTRACT(EPOCH FROM (NOW() - b.updated_at)) / 60 AS minutes_since_bus_update,
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS current_driver_status,
  d.updated_at AS driver_updated_at,
  EXTRACT(EPOCH FROM (NOW() - d.updated_at)) / 60 AS minutes_since_driver_update
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.updated_at > NOW() - INTERVAL '1 hour'
   OR d.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY GREATEST(b.updated_at, COALESCE(d.updated_at, '1970-01-01'::timestamp)) DESC;

-- ============================================
-- 4. MANUAL TEST: Try to update status directly
-- ============================================
-- Replace 'YOUR_BUS_ID' and 'YOUR_DRIVER_ID' with actual IDs
-- This will show you if the update works when run directly

/*
-- Step 1: Check current state
SELECT id, name, status, driver_id, updated_at 
FROM buses 
WHERE id = 'YOUR_BUS_ID';

SELECT id, name, status, updated_at 
FROM drivers 
WHERE id = 'YOUR_DRIVER_ID';

-- Step 2: Try updating bus status (what the app should do)
UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW()
WHERE id = 'YOUR_BUS_ID'
RETURNING id, name, status, driver_id, updated_at;

-- Step 3: Try updating driver status (what the app should do)
UPDATE drivers 
SET 
  status = 'inactive',
  updated_at = NOW()
WHERE id = 'YOUR_DRIVER_ID'
RETURNING id, name, status, updated_at;

-- Step 4: Check if update worked
SELECT id, name, status, driver_id, updated_at 
FROM buses 
WHERE id = 'YOUR_BUS_ID';

SELECT id, name, status, updated_at 
FROM drivers 
WHERE id = 'YOUR_DRIVER_ID';
*/

-- ============================================
-- 5. CHECK FOR ACTIVE BUSES THAT SHOULD BE INACTIVE
-- ============================================
-- Find buses that are still active but should be inactive
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.updated_at AS bus_last_update,
  d.updated_at AS driver_last_update,
  CASE 
    WHEN b.status = 'active' AND d.status = 'inactive' THEN '⚠️ Bus active but driver inactive - MISMATCH!'
    WHEN b.status = 'active' AND b.driver_id IS NULL THEN '⚠️ Bus active but no driver assigned'
    WHEN b.status = 'inactive' AND b.driver_id IS NOT NULL THEN '⚠️ Bus inactive but still has driver'
    ELSE '✅ Status looks correct'
  END AS issue
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE (b.status = 'active' AND (d.status = 'inactive' OR b.driver_id IS NULL))
   OR (b.status = 'inactive' AND b.driver_id IS NOT NULL);

-- ============================================
-- 6. CHECK TABLE STRUCTURE
-- ============================================
-- Verify the buses table has the correct columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'buses'
  AND column_name IN ('status', 'driver_id', 'tracking_status', 'updated_at')
ORDER BY column_name;

-- Verify the drivers table has the correct columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'drivers'
  AND column_name IN ('status', 'updated_at')
ORDER BY column_name;

-- ============================================
-- 7. CHECK FOR CONSTRAINT VIOLATIONS
-- ============================================
-- See if there are any CHECK constraints that might be blocking updates
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'buses'::regclass
  AND contype = 'c'
ORDER BY conname;

SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'drivers'::regclass
  AND contype = 'c'
ORDER BY conname;

