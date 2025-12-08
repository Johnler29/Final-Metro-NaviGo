-- Test script to verify PWD seat updates work
-- Run this in Supabase SQL Editor to test if updates are working

-- First, check current values for a bus
-- Replace 'YOUR_BUS_ID' with an actual bus ID from your buses table
SELECT 
  id,
  bus_number,
  name,
  current_pwd_passengers,
  pwd_seats_available,
  pwd_seats,
  current_passengers,
  capacity_percentage
FROM buses
LIMIT 5;

-- Test update (replace 'YOUR_BUS_ID' with an actual bus ID)
-- This should update the PWD passengers to 2
UPDATE buses
SET 
  current_pwd_passengers = 2,
  pwd_seats_available = 2,  -- Should be 4 - 2 = 2
  updated_at = NOW()
WHERE id = (SELECT id FROM buses LIMIT 1)
RETURNING 
  id,
  bus_number,
  current_pwd_passengers,
  pwd_seats_available,
  pwd_seats;

-- Check if the trigger is working
-- The trigger should automatically calculate pwd_seats_available
-- Let's test by updating just current_pwd_passengers
UPDATE buses
SET 
  current_pwd_passengers = 3,
  updated_at = NOW()
WHERE id = (SELECT id FROM buses LIMIT 1)
RETURNING 
  id,
  bus_number,
  current_pwd_passengers,
  pwd_seats_available,  -- Should be automatically calculated as 4 - 3 = 1
  pwd_seats;

-- Check RLS policies that might block updates
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

-- Check if there are any constraints that might be blocking
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'buses'::regclass
  AND conname LIKE '%pwd%'
ORDER BY conname;
