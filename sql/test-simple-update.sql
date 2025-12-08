-- Simple test to verify anon role can update buses
-- Run this to test if the anon key can actually update

-- First, let's see what role the app is using
-- The app uses the anon key, so we need to test as anon role

-- Switch to anon role context (simulate what the app does)
SET ROLE anon;

-- Try a simple update
DO $$
DECLARE
  test_bus_id UUID;
  update_count INTEGER;
BEGIN
  -- Get first bus ID
  SELECT id INTO test_bus_id FROM buses LIMIT 1;
  
  IF test_bus_id IS NULL THEN
    RAISE NOTICE 'No buses found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing update as anon role on bus: %', test_bus_id;
  
  -- Try to update
  UPDATE buses
  SET 
    current_pwd_passengers = 1,
    updated_at = NOW()
  WHERE id = test_bus_id;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  IF update_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Updated % row(s) as anon role', update_count;
  ELSE
    RAISE NOTICE '❌ FAILED: Updated 0 rows - RLS is blocking';
  END IF;
  
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '❌ PERMISSION DENIED: RLS policy is blocking updates';
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;

-- Reset role
RESET ROLE;

-- Check current policies one more time
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'buses' 
  AND cmd = 'UPDATE'
ORDER BY policyname;
