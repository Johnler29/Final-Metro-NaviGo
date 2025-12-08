-- Ping Notifications System Setup
-- Run this script in Supabase SQL Editor to set up the ping notification system

-- ========================================
-- STEP 1: Create ping_notifications table
-- ========================================

-- Drop existing foreign key constraints if they exist (for migration)
ALTER TABLE IF EXISTS ping_notifications DROP CONSTRAINT IF EXISTS ping_notifications_user_id_fkey;
ALTER TABLE IF EXISTS user_ping_limits DROP CONSTRAINT IF EXISTS user_ping_limits_user_id_fkey;

CREATE TABLE IF NOT EXISTS ping_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  ping_type VARCHAR(50) NOT NULL DEFAULT 'ride_request' CHECK (ping_type IN ('ride_request', 'eta_request', 'location_request', 'general_message', 'emergency')),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 2: Create user_ping_limits table for rate limiting
-- ========================================

-- Clean up invalid user_id values before adding constraints
DO $$ 
BEGIN
  -- Clean up ping_notifications: delete rows with invalid user_ids
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ping_notifications') THEN
    DELETE FROM ping_notifications 
    WHERE user_id IS NULL 
       OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
       OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = ping_notifications.user_id);
  END IF;
  
  -- Clean up user_ping_limits: delete rows with invalid user_ids
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ping_limits') THEN
    DELETE FROM user_ping_limits 
    WHERE user_id IS NULL 
       OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
       OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_ping_limits.user_id);
  END IF;
  
  -- Add foreign key constraints if they don't exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ping_notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ping_notifications_user_id_fkey'
    ) THEN
      ALTER TABLE ping_notifications 
      ADD CONSTRAINT ping_notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ping_limits') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_ping_limits_user_id_fkey'
    ) THEN
      ALTER TABLE user_ping_limits 
      ADD CONSTRAINT user_ping_limits_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_ping_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  pings_today INTEGER DEFAULT 0,
  last_ping_at TIMESTAMP WITH TIME ZONE,
  blocked_until TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 3: Create indexes for performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_ping_notifications_user_id ON ping_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ping_notifications_bus_id ON ping_notifications(bus_id);
CREATE INDEX IF NOT EXISTS idx_ping_notifications_status ON ping_notifications(status);
CREATE INDEX IF NOT EXISTS idx_ping_notifications_created_at ON ping_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ping_limits_user_id ON user_ping_limits(user_id);

-- ========================================
-- STEP 4: Create updated_at trigger
-- ========================================

DROP TRIGGER IF EXISTS update_ping_notifications_updated_at ON ping_notifications;
CREATE TRIGGER update_ping_notifications_updated_at 
  BEFORE UPDATE ON ping_notifications 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_ping_limits_updated_at ON user_ping_limits;
CREATE TRIGGER update_user_ping_limits_updated_at 
  BEFORE UPDATE ON user_ping_limits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 5: Create function to check ping rate limit
-- ========================================

-- Drop existing function if it exists (in case return type changed)
DROP FUNCTION IF EXISTS check_ping_rate_limit(UUID);

CREATE OR REPLACE FUNCTION check_ping_rate_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_limit_record user_ping_limits%ROWTYPE;
  v_pings_today INTEGER;
  v_last_ping_at TIMESTAMP WITH TIME ZONE;
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_is_blocked BOOLEAN;
  v_cooldown_remaining INTEGER;
  v_result JSONB;
BEGIN
  -- Get or create user limit record
  SELECT * INTO v_limit_record
  FROM user_ping_limits
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_ping_limits (user_id, pings_today, last_ping_at, is_blocked)
    VALUES (p_user_id, 0, NULL, false)
    RETURNING * INTO v_limit_record;
  END IF;
  
  -- Reset daily count if it's a new day (UTC)
  IF v_limit_record.pings_today > 0 AND 
     (v_limit_record.last_ping_at IS NULL OR 
      DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') > DATE_TRUNC('day', v_limit_record.last_ping_at AT TIME ZONE 'UTC')) THEN
    UPDATE user_ping_limits
    SET pings_today = 0
    WHERE user_id = p_user_id;
    v_limit_record.pings_today := 0;
  END IF;
  
  -- Check if user is blocked
  v_is_blocked := v_limit_record.is_blocked;
  v_blocked_until := v_limit_record.blocked_until;
  
  IF v_is_blocked AND v_blocked_until IS NOT NULL AND v_blocked_until > NOW() THEN
    -- Still blocked
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'message', 'You are temporarily blocked from sending pings. Please try again later.',
      'blocked_until', v_blocked_until,
      'cooldown_remaining', EXTRACT(EPOCH FROM (v_blocked_until - NOW()))::INTEGER
    );
    RETURN v_result;
  END IF;
  
  -- Check daily limit (50 pings per day)
  IF v_limit_record.pings_today >= 50 THEN
    -- Block for 24 hours
    UPDATE user_ping_limits
    SET is_blocked = true,
        blocked_until = NOW() + INTERVAL '24 hours'
    WHERE user_id = p_user_id;
    
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_exceeded',
      'message', 'Daily ping limit (50) exceeded. You are blocked for 24 hours.',
      'blocked_until', NOW() + INTERVAL '24 hours',
      'cooldown_remaining', 86400
    );
    RETURN v_result;
  END IF;
  
  -- Check cooldown period (30 seconds between pings)
  IF v_limit_record.last_ping_at IS NOT NULL THEN
    v_cooldown_remaining := EXTRACT(EPOCH FROM (NOW() - (v_limit_record.last_ping_at + INTERVAL '30 seconds')))::INTEGER;
    
    IF v_cooldown_remaining < 0 THEN
      v_result := jsonb_build_object(
        'allowed', false,
        'reason', 'cooldown',
        'message', 'Please wait before sending another ping.',
        'cooldown_remaining', ABS(v_cooldown_remaining),
        'blocked_until', NULL
      );
      RETURN v_result;
    END IF;
  END IF;
  
  -- Check spam detection (3+ pings in 1 minute)
  SELECT COUNT(*) INTO v_pings_today
  FROM ping_notifications
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF v_pings_today >= 3 THEN
    -- Block for 1 hour
    UPDATE user_ping_limits
    SET is_blocked = true,
        blocked_until = NOW() + INTERVAL '1 hour'
    WHERE user_id = p_user_id;
    
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'spam_detected',
      'message', 'Too many pings in a short time. You are blocked for 1 hour.',
      'blocked_until', NOW() + INTERVAL '1 hour',
      'cooldown_remaining', 3600
    );
    RETURN v_result;
  END IF;
  
  -- All checks passed
  v_result := jsonb_build_object(
    'allowed', true,
    'message', 'You can send a ping.',
    'pings_today', v_limit_record.pings_today,
    'pings_remaining', 50 - v_limit_record.pings_today,
    'cooldown_remaining', 0
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 6: Create function to send ping with rate limiting
-- ========================================

-- Drop existing function if it exists (in case signature changed)
DROP FUNCTION IF EXISTS send_ping_with_limit(UUID, UUID, VARCHAR, TEXT, DECIMAL, DECIMAL, TEXT);

CREATE OR REPLACE FUNCTION send_ping_with_limit(
  p_user_id UUID,
  p_bus_id UUID,
  p_ping_type VARCHAR(50) DEFAULT 'ride_request',
  p_message TEXT DEFAULT NULL,
  p_location_latitude DECIMAL(10, 8) DEFAULT NULL,
  p_location_longitude DECIMAL(11, 8) DEFAULT NULL,
  p_location_address TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_rate_check JSONB;
  v_ping_id UUID;
  v_result JSONB;
BEGIN
  -- Check rate limit first
  v_rate_check := check_ping_rate_limit(p_user_id);
  
  IF (v_rate_check->>'allowed')::boolean = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_rate_check->>'message',
      'reason', v_rate_check->>'reason',
      'cooldown_remaining', (v_rate_check->>'cooldown_remaining')::INTEGER,
      'blocked_until', v_rate_check->>'blocked_until'
    );
  END IF;
  
  -- Create the ping notification
  INSERT INTO ping_notifications (
    user_id,
    bus_id,
    ping_type,
    message,
    location_latitude,
    location_longitude,
    location_address,
    status
  )
  VALUES (
    p_user_id,
    p_bus_id,
    p_ping_type,
    p_message,
    p_location_latitude,
    p_location_longitude,
    p_location_address,
    'pending'
  )
  RETURNING id INTO v_ping_id;
  
  -- Update user ping limits
  UPDATE user_ping_limits
  SET pings_today = pings_today + 1,
      last_ping_at = NOW(),
      is_blocked = false,
      blocked_until = NULL
  WHERE user_id = p_user_id;
  
  -- If record doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO user_ping_limits (user_id, pings_today, last_ping_at, is_blocked)
    VALUES (p_user_id, 1, NOW(), false);
  END IF;
  
  -- Return success result
  SELECT * INTO v_rate_check FROM check_ping_rate_limit(p_user_id);
  
  v_result := jsonb_build_object(
    'success', true,
    'ping_id', v_ping_id,
    'message', 'Ping sent successfully!',
    'remaining_today', (v_rate_check->>'pings_remaining')::INTEGER,
    'pings_today', (v_rate_check->>'pings_today')::INTEGER
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 7: Create function to get user ping status
-- ========================================

-- Drop existing function if it exists (in case return type changed)
DROP FUNCTION IF EXISTS get_user_ping_status(UUID);

CREATE OR REPLACE FUNCTION get_user_ping_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_limit_record user_ping_limits%ROWTYPE;
  v_pings_today INTEGER;
  v_cooldown_remaining INTEGER := 0;
  v_is_blocked BOOLEAN;
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_can_ping BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get user limit record
  SELECT * INTO v_limit_record
  FROM user_ping_limits
  WHERE user_id = p_user_id;
  
  -- If no record exists, return defaults
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_blocked', false,
      'blocked_until', NULL,
      'pings_today', 0,
      'pings_remaining', 50,
      'cooldown_remaining', 0,
      'can_ping', true
    );
  END IF;
  
  -- Reset daily count if it's a new day
  IF v_limit_record.pings_today > 0 AND 
     (v_limit_record.last_ping_at IS NULL OR 
      DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') > DATE_TRUNC('day', v_limit_record.last_ping_at AT TIME ZONE 'UTC')) THEN
    UPDATE user_ping_limits
    SET pings_today = 0
    WHERE user_id = p_user_id;
    v_limit_record.pings_today := 0;
  END IF;
  
  -- Calculate cooldown remaining
  IF v_limit_record.last_ping_at IS NOT NULL THEN
    v_cooldown_remaining := GREATEST(0, EXTRACT(EPOCH FROM ((v_limit_record.last_ping_at + INTERVAL '30 seconds') - NOW()))::INTEGER);
  END IF;
  
  -- Check if blocked
  v_is_blocked := v_limit_record.is_blocked;
  v_blocked_until := v_limit_record.blocked_until;
  
  IF v_is_blocked AND v_blocked_until IS NOT NULL AND v_blocked_until > NOW() THEN
    v_can_ping := false;
  ELSIF v_limit_record.pings_today >= 50 THEN
    v_can_ping := false;
  ELSIF v_cooldown_remaining > 0 THEN
    v_can_ping := false;
  ELSE
    v_can_ping := true;
  END IF;
  
  v_result := jsonb_build_object(
    'is_blocked', v_is_blocked AND (v_blocked_until IS NULL OR v_blocked_until > NOW()),
    'blocked_until', v_blocked_until,
    'pings_today', v_limit_record.pings_today,
    'pings_remaining', GREATEST(0, 50 - v_limit_record.pings_today),
    'cooldown_remaining', v_cooldown_remaining,
    'can_ping', v_can_ping
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 8: Create function to acknowledge ping
-- ========================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS acknowledge_ping_notification(UUID);

CREATE OR REPLACE FUNCTION acknowledge_ping_notification(p_ping_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ping_notifications
  SET status = 'acknowledged',
      acknowledged_at = NOW(),
      updated_at = NOW()
  WHERE id = p_ping_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 9: Create function to complete ping
-- ========================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS complete_ping_notification(UUID);

CREATE OR REPLACE FUNCTION complete_ping_notification(p_ping_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ping_notifications
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_ping_id
    AND status IN ('pending', 'acknowledged');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 10: Create function to get user ping notifications
-- ========================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_ping_notifications(UUID);

CREATE OR REPLACE FUNCTION get_user_ping_notifications(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  bus_id UUID,
  ping_type VARCHAR(50),
  message TEXT,
  status VARCHAR(20),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  bus_number VARCHAR(50),
  bus_name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pn.id,
    pn.bus_id,
    pn.ping_type,
    pn.message,
    pn.status,
    pn.location_latitude,
    pn.location_longitude,
    pn.location_address,
    pn.created_at,
    pn.acknowledged_at,
    pn.completed_at,
    b.bus_number,
    b.name AS bus_name
  FROM ping_notifications pn
  LEFT JOIN buses b ON pn.bus_id = b.id
  WHERE pn.user_id = p_user_id
  ORDER BY pn.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 11: Create function to get bus ping notifications
-- ========================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_bus_ping_notifications(UUID);

CREATE OR REPLACE FUNCTION get_bus_ping_notifications(p_bus_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  ping_type VARCHAR(50),
  message TEXT,
  status VARCHAR(20),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  user_name VARCHAR(100),
  user_email VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pn.id,
    pn.user_id,
    pn.ping_type,
    pn.message,
    pn.status,
    pn.location_latitude,
    pn.location_longitude,
    pn.location_address,
    pn.created_at,
    pn.acknowledged_at,
    pn.completed_at,
    COALESCE(au.email, 'User') AS user_name,
    au.email AS user_email
  FROM ping_notifications pn
  LEFT JOIN auth.users au ON pn.user_id = au.id
  WHERE pn.bus_id = p_bus_id
    AND pn.status IN ('pending', 'acknowledged')
  ORDER BY pn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 12: Enable Row Level Security (RLS)
-- ========================================

ALTER TABLE ping_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ping_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own ping notifications" ON ping_notifications;
DROP POLICY IF EXISTS "Users can insert own ping notifications" ON ping_notifications;
DROP POLICY IF EXISTS "Users can view own ping limits" ON user_ping_limits;
DROP POLICY IF EXISTS "Users can update own ping limits" ON user_ping_limits;

-- Policy: Users can view their own ping notifications
CREATE POLICY "Users can view own ping notifications"
  ON ping_notifications FOR SELECT
  USING (auth.uid()::text = user_id::text OR EXISTS (
    SELECT 1 FROM buses WHERE buses.id = ping_notifications.bus_id AND buses.driver_id::text = auth.uid()::text
  ));

-- Policy: Users can insert their own ping notifications
CREATE POLICY "Users can insert own ping notifications"
  ON ping_notifications FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can view their own ping limits
CREATE POLICY "Users can view own ping limits"
  ON user_ping_limits FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can update their own ping limits (via functions)
CREATE POLICY "Users can update own ping limits"
  ON user_ping_limits FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- ========================================
-- STEP 13: Grant necessary permissions
-- ========================================

GRANT SELECT, INSERT, UPDATE ON ping_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_ping_limits TO authenticated;
GRANT EXECUTE ON FUNCTION check_ping_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_ping_with_limit(UUID, UUID, VARCHAR, TEXT, DECIMAL, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ping_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_ping_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ping_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ping_notifications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bus_ping_notifications(UUID) TO authenticated;

-- ========================================
-- Setup Complete!
-- ========================================
-- The ping notification system is now ready to use.
-- Users can send pings with automatic rate limiting:
-- - 50 pings per day maximum
-- - 30 second cooldown between pings
-- - Spam detection (3+ pings in 1 minute = 1 hour block)
-- ========================================

