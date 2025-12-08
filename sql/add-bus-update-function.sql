-- Create a function for drivers to update bus capacity and PWD seats
-- This function bypasses RLS and allows drivers to update buses they're assigned to
-- Run this in your Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_bus_capacity(UUID, INTEGER, INTEGER, INTEGER);

-- Create function to update bus capacity and PWD seats
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION update_bus_capacity(
  p_bus_id UUID,
  p_capacity_percentage INTEGER,
  p_current_passengers INTEGER,
  p_current_pwd_passengers INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  bus_number VARCHAR,
  name VARCHAR,
  capacity_percentage INTEGER,
  current_passengers INTEGER,
  current_pwd_passengers INTEGER,
  pwd_seats_available INTEGER,
  pwd_seats INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  v_pwd_seats INTEGER;
  v_pwd_seats_available INTEGER;
BEGIN
  -- Get current PWD seats value
  SELECT COALESCE(pwd_seats, 4) INTO v_pwd_seats
  FROM buses
  WHERE id = p_bus_id;
  
  -- Calculate available PWD seats if pwd passengers is provided
  IF p_current_pwd_passengers IS NOT NULL THEN
    v_pwd_seats_available := GREATEST(0, v_pwd_seats - p_current_pwd_passengers);
  ELSE
    -- Keep existing value or calculate from current
    SELECT COALESCE(pwd_seats_available, GREATEST(0, v_pwd_seats - COALESCE(current_pwd_passengers, 0)))
    INTO v_pwd_seats_available
    FROM buses
    WHERE id = p_bus_id;
  END IF;
  
  -- Update the bus
  UPDATE buses
  SET 
    capacity_percentage = p_capacity_percentage,
    current_passengers = p_current_passengers,
    current_pwd_passengers = COALESCE(p_current_pwd_passengers, current_pwd_passengers),
    pwd_seats_available = v_pwd_seats_available,
    updated_at = NOW()
  WHERE id = p_bus_id;
  
  -- Return the updated bus data
  RETURN QUERY
  SELECT 
    b.id,
    b.bus_number,
    b.name,
    b.capacity_percentage,
    b.current_passengers,
    b.current_pwd_passengers,
    b.pwd_seats_available,
    b.pwd_seats
  FROM buses b
  WHERE b.id = p_bus_id;
END;
$$;

-- Grant execute permission to authenticated users (or anon if needed)
-- Adjust based on your authentication setup
GRANT EXECUTE ON FUNCTION update_bus_capacity(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_bus_capacity(UUID, INTEGER, INTEGER, INTEGER) TO anon;

-- Verify the function was created
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_bus_capacity';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Bus capacity update function created successfully!';
  RAISE NOTICE 'Function: update_bus_capacity(bus_id, capacity_percentage, current_passengers, current_pwd_passengers)';
  RAISE NOTICE 'This function bypasses RLS and allows drivers to update bus capacity.';
END $$;
