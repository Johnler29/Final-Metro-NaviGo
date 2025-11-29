-- MetroBus Tracker Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor

-- Drop all existing tables to ensure clean recreation
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP TABLE IF EXISTS buses CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables

-- Routes table (create first since buses references it)
CREATE TABLE routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_number VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_location VARCHAR(200),
  end_location VARCHAR(200),
  -- New fields used by the app
  origin TEXT,
  destination TEXT,
  estimated_duration INTEGER, -- in minutes
  fare DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers table (create before buses since buses references it)
CREATE TABLE drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  license_number VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  email VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buses table with integrated tracking
CREATE TABLE buses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_number VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  capacity INTEGER DEFAULT 50,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  route_id UUID REFERENCES routes(id),
  driver_id UUID REFERENCES drivers(id),
  -- Integrated tracking fields
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  speed DECIMAL(5, 2),
  heading INTEGER,
  tracking_status VARCHAR(20) DEFAULT 'moving' CHECK (tracking_status IN ('moving', 'stopped', 'at_stop')),
  last_location_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT buses_bus_number_key UNIQUE (bus_number)
);

-- Stops table
CREATE TABLE stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  route_id UUID REFERENCES routes(id),
  sequence INTEGER, -- order of stops in a route
  estimated_time_to_next INTEGER, -- minutes to next stop
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table
CREATE TABLE schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id),
  bus_id UUID REFERENCES buses(id),
  departure_time TIME NOT NULL,
  arrival_time TIME,
  days_of_week INTEGER[], -- 1=Monday, 2=Tuesday, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (for passengers)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Bus tracking is now integrated into the buses table
-- This eliminates redundancy and simplifies the data model

-- Feedback table
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category VARCHAR(50), -- 'general', 'service', 'app', 'safety'
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver assignments table for tracking driver-bus-route assignments
CREATE TABLE driver_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  assigned_by UUID, -- References admin user (can be null for system assignments)
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Indexes will be created after tables and sample data

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_buses_updated_at ON buses;
CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON buses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stops_updated_at ON stops;
CREATE TRIGGER update_stops_updated_at BEFORE UPDATE ON stops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bus_tracking_updated_at ON bus_tracking;
CREATE TRIGGER update_bus_tracking_updated_at BEFORE UPDATE ON bus_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_assignments_updated_at ON driver_assignments;
CREATE TRIGGER update_driver_assignments_updated_at BEFORE UPDATE ON driver_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (safe to re-run)
ALTER TABLE buses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops              ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;

-- Public read policies (drop/create for idempotency)
DROP POLICY IF EXISTS "Public read access" ON buses;
CREATE POLICY "Public read access" ON buses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON routes;
CREATE POLICY "Public read access" ON routes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON stops;
CREATE POLICY "Public read access" ON stops FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON schedules;
CREATE POLICY "Public read access" ON schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON drivers;
CREATE POLICY "Public read access" ON drivers FOR SELECT USING (true);

-- Feedback policies
DROP POLICY IF EXISTS "Users can insert feedback" ON feedback;
CREATE POLICY "Users can insert feedback" ON feedback FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own feedback" ON feedback;
CREATE POLICY "Users can read own feedback" ON feedback FOR SELECT USING (true);

-- Driver assignments policies
DROP POLICY IF EXISTS "Public read access" ON driver_assignments;
CREATE POLICY "Public read access" ON driver_assignments FOR SELECT USING (true);

-- Note: No longer need buses_with_tracking view since tracking is integrated into buses table
-- The buses table now contains all necessary data directly

-- Note: Removed active_buses_with_routes and route_schedules_detailed views
-- The main buses_with_tracking view is sufficient for most use cases
-- Additional filtering can be done in the application layer

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS get_nearby_buses(DECIMAL, DECIMAL, DECIMAL);

-- Function to get nearby buses within a radius
CREATE FUNCTION get_nearby_buses(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  radius_km DECIMAL DEFAULT 5.0
)
RETURNS TABLE (
  bus_id UUID,
  bus_number VARCHAR(50),
  bus_name VARCHAR(100),
  route_number VARCHAR(20),
  origin TEXT,
  destination TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  speed DECIMAL(5, 2),
  tracking_status VARCHAR(20),
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.bus_number,
    b.name,
    r.route_number,
    r.origin,
    r.destination,
    b.latitude,
    b.longitude,
    b.speed,
    b.tracking_status,
    ROUND(
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(b.latitude)) * 
        cos(radians(b.longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(b.latitude))
      )::DECIMAL, 2
    ) AS distance_km
  FROM buses b
  LEFT JOIN routes r ON r.id = b.route_id
  WHERE b.status = 'active'
    AND b.latitude IS NOT NULL
    AND b.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(b.latitude)) * 
        cos(radians(b.longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(b.latitude))
      )
    ) <= radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Backfill origin/destination from legacy columns if empty
UPDATE routes
SET origin = COALESCE(origin, start_location),
    destination = COALESCE(destination, end_location)
WHERE origin IS NULL OR destination IS NULL;

-- Insert sample data
INSERT INTO routes (route_number, name, description, start_location, end_location, origin, destination, estimated_duration, fare) VALUES
('R001', 'Dasmarinas - Manila', 'Main route from Dasmarinas to Manila', 'Dasmarinas City', 'Manila City', 'Dasmarinas City', 'Manila City', 120, 50.00),
('R002', 'Dasmarinas - Makati', 'Route from Dasmarinas to Makati', 'Dasmarinas City', 'Makati City', 'Dasmarinas City', 'Makati City', 90, 45.00),
('R003', 'Dasmarinas - Quezon City', 'Route from Dasmarinas to Quezon City', 'Dasmarinas City', 'Quezon City', 'Dasmarinas City', 'Quezon City', 100, 48.00)
ON CONFLICT (route_number) DO NOTHING;

INSERT INTO drivers (name, license_number, phone, email) VALUES
('Juan Dela Cruz', 'DL123456789', '+639123456789', 'juan.delacruz@metro.com'),
('Maria Santos', 'DL987654321', '+639987654321', 'maria.santos@metro.com'),
('Pedro Reyes', 'DL456789123', '+639456789123', 'pedro.reyes@metro.com')
ON CONFLICT (license_number) DO NOTHING;

INSERT INTO buses (bus_number, name, capacity, route_id, driver_id, latitude, longitude, speed, heading, tracking_status, last_location_update) VALUES
('B001', 'Metro Link Bus # 20', 50, (SELECT id FROM routes WHERE route_number = 'R001'), (SELECT id FROM drivers WHERE license_number = 'DL123456789'), 14.3294, 120.9366, 35.5, 90, 'moving', NOW()),
('B002', 'Metro Link Bus # 15', 50, (SELECT id FROM routes WHERE route_number = 'R002'), (SELECT id FROM drivers WHERE license_number = 'DL987654321'), 14.4591, 120.9468, 0.0, 0, 'stopped', NOW()),
('B003', 'Metro Link Bus # 10', 50, (SELECT id FROM routes WHERE route_number = 'R003'), (SELECT id FROM drivers WHERE license_number = 'DL456789123'), 14.5995, 120.9842, 28.3, 180, 'moving', NOW())
ON CONFLICT (bus_number) DO NOTHING;

INSERT INTO stops (name, address, latitude, longitude, route_id, sequence, estimated_time_to_next) VALUES
('Dasmarinas Terminal', 'Dasmarinas City, Cavite', 14.3294, 120.9366, (SELECT id FROM routes WHERE route_number = 'R001'), 1, 15),
('Bacoor', 'Bacoor City, Cavite', 14.4591, 120.9468, (SELECT id FROM routes WHERE route_number = 'R001'), 2, 20),
('Manila City Hall', 'Manila City', 14.5995, 120.9842, (SELECT id FROM routes WHERE route_number = 'R001'), 3, 0)
ON CONFLICT DO NOTHING;

-- Note: Bus tracking data is now integrated into the buses table
-- No separate tracking inserts needed

-- Insert sample schedules
INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, days_of_week, is_active) VALUES
((SELECT id FROM routes WHERE route_number = 'R001'), (SELECT id FROM buses WHERE bus_number = 'B001'), '06:00', '08:00', ARRAY[1,2,3,4,5], true),
((SELECT id FROM routes WHERE route_number = 'R001'), (SELECT id FROM buses WHERE bus_number = 'B001'), '14:00', '16:00', ARRAY[1,2,3,4,5], true),
((SELECT id FROM routes WHERE route_number = 'R002'), (SELECT id FROM buses WHERE bus_number = 'B002'), '07:00', '08:30', ARRAY[1,2,3,4,5], true),
((SELECT id FROM routes WHERE route_number = 'R002'), (SELECT id FROM buses WHERE bus_number = 'B002'), '15:00', '16:30', ARRAY[1,2,3,4,5], true),
((SELECT id FROM routes WHERE route_number = 'R003'), (SELECT id FROM buses WHERE bus_number = 'B003'), '08:00', '09:40', ARRAY[1,2,3,4,5], true),
((SELECT id FROM routes WHERE route_number = 'R003'), (SELECT id FROM buses WHERE bus_number = 'B003'), '16:00', '17:40', ARRAY[1,2,3,4,5], true)
ON CONFLICT DO NOTHING;

-- Additional useful functions

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS update_bus_location(UUID, DECIMAL, DECIMAL, DECIMAL, INTEGER, VARCHAR);

-- Function to update bus location (for real-time tracking)
CREATE FUNCTION update_bus_location(
  p_bus_id UUID,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_speed DECIMAL(5, 2) DEFAULT NULL,
  p_heading INTEGER DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'moving'
)
RETURNS VOID AS $$
BEGIN
  UPDATE buses SET
    latitude = p_latitude,
    longitude = p_longitude,
    speed = p_speed,
    heading = p_heading,
    tracking_status = p_status,
    last_location_update = NOW(),
    updated_at = NOW()
  WHERE id = p_bus_id;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS update_bus_location_simple(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL);

-- Simplified function for real-time bus location updates with better response
-- FIX: Validates coordinates before updating to prevent NULL coordinate issues
CREATE FUNCTION update_bus_location_simple(
  p_bus_id UUID,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_accuracy DECIMAL(5, 2) DEFAULT NULL,
  p_speed_kmh DECIMAL(5, 2) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_bus_exists BOOLEAN;
  v_coordinates_valid BOOLEAN;
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

  -- Validate coordinates: both must be non-NULL and within valid ranges
  v_coordinates_valid := (
    p_latitude IS NOT NULL 
    AND p_longitude IS NOT NULL
    AND p_latitude BETWEEN -90 AND 90
    AND p_longitude BETWEEN -180 AND 180
  );

  -- Only update location fields if coordinates are valid
  IF v_coordinates_valid THEN
    -- Update bus location with all fields
    -- NOTE: buses table doesn't have an 'accuracy' column, so we skip it
    UPDATE buses SET
      latitude = p_latitude,
      longitude = p_longitude,
      speed = p_speed_kmh,
      tracking_status = CASE 
        WHEN p_speed_kmh > 0 THEN 'moving'
        WHEN p_speed_kmh = 0 THEN 'stopped'
        ELSE tracking_status
      END,
      last_location_update = NOW(),  -- Only update timestamp when coordinates are valid
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
  ELSE
    -- Reject update when coordinates are invalid
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid coordinates: latitude and longitude must be valid numbers',
      'bus_id', p_bus_id,
      'latitude_received', p_latitude,
      'longitude_received', p_longitude,
      'error_code', 'INVALID_COORDINATES'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS get_bus_statistics();

-- Function to get bus statistics
CREATE FUNCTION get_bus_statistics()
RETURNS TABLE (
  total_buses INTEGER,
  active_buses INTEGER,
  buses_with_location INTEGER,
  total_routes INTEGER,
  active_routes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM buses) AS total_buses,
    (SELECT COUNT(*)::INTEGER FROM buses WHERE status = 'active') AS active_buses,
    (SELECT COUNT(*)::INTEGER FROM buses WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS buses_with_location,
    (SELECT COUNT(*)::INTEGER FROM routes) AS total_routes,
    (SELECT COUNT(*)::INTEGER FROM routes WHERE status = 'active') AS active_routes;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance (after tables and data)
CREATE INDEX IF NOT EXISTS idx_buses_route_id ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_driver_id ON buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_bus_number ON buses(bus_number);
CREATE INDEX IF NOT EXISTS idx_buses_location ON buses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buses_tracking_status ON buses(tracking_status);
CREATE INDEX IF NOT EXISTS idx_stops_route_id ON stops(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_route_id ON schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_bus_id ON schedules(bus_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_id ON driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_bus_id ON driver_assignments(bus_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_route_id ON driver_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_is_active ON driver_assignments(is_active);

-- Grant necessary permissions for the functions
GRANT EXECUTE ON FUNCTION get_nearby_buses TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_bus_location TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_bus_location_simple TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_bus_statistics TO anon, authenticated; 