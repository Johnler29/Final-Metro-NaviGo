  -- Verify that bus updates are allowed
  -- Run this in Supabase SQL Editor to check if updates work

  -- First, check all UPDATE policies on buses table
  SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
  FROM pg_policies
  WHERE tablename = 'buses' 
    AND cmd = 'UPDATE'
  ORDER BY policyname;

  -- Test if we can update a bus (replace with actual bus ID)
  -- This simulates what the app is trying to do
  DO $$
  DECLARE
    test_bus_id UUID;
    update_count INTEGER;
  BEGIN
    -- Get first bus ID
    SELECT id INTO test_bus_id FROM buses LIMIT 1;
    
    IF test_bus_id IS NULL THEN
      RAISE NOTICE 'No buses found to test';
      RETURN;
    END IF;
    
    RAISE NOTICE 'Testing update on bus: %', test_bus_id;
    
    -- Try to update
    UPDATE buses
    SET 
      current_pwd_passengers = 2,
      pwd_seats_available = 2,
      updated_at = NOW()
    WHERE id = test_bus_id;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    IF update_count > 0 THEN
      RAISE NOTICE '✅ UPDATE SUCCEEDED: % row(s) updated', update_count;
    ELSE
      RAISE NOTICE '⚠️ UPDATE RETURNED 0 ROWS: Bus may not exist or RLS blocked it';
    END IF;
    
    -- Try to select the updated data
    PERFORM id, current_pwd_passengers, pwd_seats_available 
    FROM buses 
    WHERE id = test_bus_id;
    
    RAISE NOTICE '✅ SELECT SUCCEEDED: Can read updated data';
    
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '❌ PERMISSION DENIED: RLS is blocking the update';
    WHEN OTHERS THEN
      RAISE NOTICE '❌ ERROR: %', SQLERRM;
  END $$;

  -- Check if RLS is enabled
  SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
  FROM pg_tables
  WHERE tablename = 'buses'
    AND schemaname = 'public';

  -- Check current user/role
  SELECT current_user, session_user;
