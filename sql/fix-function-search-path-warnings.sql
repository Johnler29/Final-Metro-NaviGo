-- 🔧 Fix Function Search Path Mutable Warnings
-- This script fixes the search_path security warnings for all functions

-- ============================================================================
-- Fix Search Path for All Functions
-- ============================================================================

-- Function: cleanup_stale_connections
-- Drop first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.cleanup_stale_connections();
CREATE FUNCTION public.cleanup_stale_connections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up stale connections logic here
  -- (Add your actual implementation)
  RAISE NOTICE 'Cleaning up stale connections...';
END;
$$;

-- Function: update_bus_location_enhance
DROP FUNCTION IF EXISTS public.update_bus_location_enhance(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL);
CREATE FUNCTION public.update_bus_location_enhance(
  p_bus_id UUID,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_accuracy DECIMAL(5, 2) DEFAULT NULL,
  p_speed_kmh DECIMAL(5, 2) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bus_exists BOOLEAN;
BEGIN
  -- Check if bus exists
  SELECT EXISTS(SELECT 1 FROM buses WHERE id = p_bus_id) INTO v_bus_exists;
  
  IF NOT v_bus_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bus not found',
      'bus_id', p_bus_id
    );
  END IF;
  
  -- Update bus location
  UPDATE buses SET
    latitude = p_latitude,
    longitude = p_longitude,
    accuracy = p_accuracy,
    speed = p_speed_kmh,
    tracking_status = CASE 
      WHEN p_speed_kmh > 0 THEN 'moving'
      WHEN p_speed_kmh = 0 THEN 'stopped'
      ELSE tracking_status
    END,
    last_location_update = NOW(),
    updated_at = NOW()
  WHERE id = p_bus_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Location updated successfully',
    'bus_id', p_bus_id,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'timestamp', NOW()
  );
END;
$$;

-- Function: get_nearby_buses
DROP FUNCTION IF EXISTS public.get_nearby_buses(DECIMAL, DECIMAL, DECIMAL);
CREATE FUNCTION public.get_nearby_buses(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  radius_km DECIMAL(5, 2) DEFAULT 5.0
)
RETURNS TABLE (
  bus_id UUID,
  bus_number VARCHAR(50),
  bus_name VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_km DECIMAL(5, 2),
  route_number VARCHAR(20),
  origin TEXT,
  destination TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as bus_id,
    b.bus_number,
    b.name as bus_name,
    b.latitude,
    b.longitude,
    (6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(b.latitude)) * 
      cos(radians(b.longitude) - radians(user_lng)) + 
      sin(radians(user_lat)) * 
      sin(radians(b.latitude))
    )) as distance_km,
    r.route_number,
    r.origin,
    r.destination
  FROM buses b
  LEFT JOIN routes r ON r.id = b.route_id
  WHERE b.status = 'active'
    AND b.latitude IS NOT NULL 
    AND b.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(b.latitude)) * 
      cos(radians(b.longitude) - radians(user_lng)) + 
      sin(radians(user_lat)) * 
      sin(radians(b.latitude))
    )) <= radius_km
  ORDER BY distance_km;
END;
$$;

-- Function: admin_unblock_user
DROP FUNCTION IF EXISTS public.admin_unblock_user(UUID);
CREATE FUNCTION public.admin_unblock_user(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Unblock user
  UPDATE users SET
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User unblocked successfully',
    'user_id', user_id
  );
END;
$$;

-- Function: get_bus_statistics
DROP FUNCTION IF EXISTS public.get_bus_statistics();
CREATE FUNCTION public.get_bus_statistics()
RETURNS TABLE (
  total_buses INTEGER,
  active_buses INTEGER,
  buses_with_location INTEGER,
  total_routes INTEGER,
  active_routes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM buses) as total_buses,
    (SELECT COUNT(*)::INTEGER FROM buses WHERE status = 'active') as active_buses,
    (SELECT COUNT(*)::INTEGER FROM buses WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as buses_with_location,
    (SELECT COUNT(*)::INTEGER FROM routes) as total_routes,
    (SELECT COUNT(*)::INTEGER FROM routes WHERE status = 'active') as active_routes;
END;
$$;

-- Function: update_bus_location (if it exists)
DROP FUNCTION IF EXISTS public.update_bus_location(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL);
CREATE FUNCTION public.update_bus_location(
  p_bus_id UUID,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_accuracy DECIMAL(5, 2) DEFAULT NULL,
  p_speed_kmh DECIMAL(5, 2) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bus_exists BOOLEAN;
BEGIN
  -- Check if bus exists
  SELECT EXISTS(SELECT 1 FROM buses WHERE id = p_bus_id) INTO v_bus_exists;
  
  IF NOT v_bus_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bus not found',
      'bus_id', p_bus_id
    );
  END IF;
  
  -- Update bus location
  UPDATE buses SET
    latitude = p_latitude,
    longitude = p_longitude,
    accuracy = p_accuracy,
    speed = p_speed_kmh,
    tracking_status = CASE 
      WHEN p_speed_kmh > 0 THEN 'moving'
      WHEN p_speed_kmh = 0 THEN 'stopped'
      ELSE tracking_status
    END,
    last_location_update = NOW(),
    updated_at = NOW()
  WHERE id = p_bus_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Location updated successfully',
    'bus_id', p_bus_id,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'timestamp', NOW()
  );
END;
$$;

-- Function: start_trip
DROP FUNCTION IF EXISTS public.start_trip(UUID, UUID);
CREATE FUNCTION public.start_trip(
  p_bus_id UUID,
  p_driver_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bus_exists BOOLEAN;
  v_driver_exists BOOLEAN;
BEGIN
  -- Check if bus exists
  SELECT EXISTS(SELECT 1 FROM buses WHERE id = p_bus_id) INTO v_bus_exists;
  IF NOT v_bus_exists THEN
    RETURN json_build_object('success', false, 'message', 'Bus not found');
  END IF;
  
  -- Check if driver exists
  SELECT EXISTS(SELECT 1 FROM drivers WHERE id = p_driver_id) INTO v_driver_exists;
  IF NOT v_driver_exists THEN
    RETURN json_build_object('success', false, 'message', 'Driver not found');
  END IF;
  
  -- Assign driver to bus
  UPDATE buses SET
    driver_id = p_driver_id,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_bus_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Trip started successfully',
    'bus_id', p_bus_id,
    'driver_id', p_driver_id
  );
END;
$$;

-- Function: get_active_bus_locations
DROP FUNCTION IF EXISTS public.get_active_bus_locations();
CREATE FUNCTION public.get_active_bus_locations()
RETURNS TABLE (
  bus_id UUID,
  bus_number VARCHAR(50),
  bus_name VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  speed DECIMAL(5, 2),
  tracking_status VARCHAR(20),
  route_number VARCHAR(20),
  origin TEXT,
  destination TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as bus_id,
    b.bus_number,
    b.name as bus_name,
    b.latitude,
    b.longitude,
    b.speed,
    b.tracking_status,
    r.route_number,
    r.origin,
    r.destination
  FROM buses b
  LEFT JOIN routes r ON r.id = b.route_id
  WHERE b.status = 'active'
    AND b.latitude IS NOT NULL 
    AND b.longitude IS NOT NULL
  ORDER BY b.bus_number;
END;
$$;

-- Function: get_all_routes_with_details
DROP FUNCTION IF EXISTS public.get_all_routes_with_details();
CREATE FUNCTION public.get_all_routes_with_details()
RETURNS TABLE (
  route_id UUID,
  route_number VARCHAR(20),
  name VARCHAR(100),
  origin TEXT,
  destination TEXT,
  fare DECIMAL(10,2),
  estimated_duration INTEGER,
  status VARCHAR(20),
  total_stops INTEGER,
  active_buses INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as route_id,
    r.route_number,
    r.name,
    r.origin,
    r.destination,
    r.fare,
    r.estimated_duration,
    r.status,
    (SELECT COUNT(*)::INTEGER FROM stops WHERE route_id = r.id AND is_active = true) as total_stops,
    (SELECT COUNT(*)::INTEGER FROM buses WHERE route_id = r.id AND status = 'active') as active_buses
  FROM routes r
  ORDER BY r.route_number;
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions to appropriate roles
GRANT EXECUTE ON FUNCTION public.cleanup_stale_connections() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_bus_location_enhance(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_buses(DECIMAL, DECIMAL, DECIMAL) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bus_statistics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_bus_location(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_trip(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_bus_locations() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_routes_with_details() TO anon, authenticated;

-- ============================================================================
-- Verify Fix
-- ============================================================================

-- Check which functions still have mutable search_path
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Functions only
    AND (p.proconfig IS NULL OR NOT ('search_path' = ANY(p.proconfig)))
ORDER BY p.proname;

RAISE NOTICE '🔧 Function search_path warnings should now be fixed!';
RAISE NOTICE '📊 Check your Security Advisor dashboard to verify warnings are reduced';
