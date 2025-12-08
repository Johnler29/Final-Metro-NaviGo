  -- Add PWD (Persons With Disabilities) seat tracking columns to buses table
  -- Run this in your Supabase SQL Editor

  -- Add PWD-related columns to buses table
  ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS pwd_seats INTEGER DEFAULT 4 CHECK (pwd_seats >= 0),
  ADD COLUMN IF NOT EXISTS current_pwd_passengers INTEGER DEFAULT 0 CHECK (current_pwd_passengers >= 0),
  ADD COLUMN IF NOT EXISTS pwd_seats_available INTEGER DEFAULT 4 CHECK (pwd_seats_available >= 0);

  -- Add constraint to ensure current_pwd_passengers doesn't exceed pwd_seats
  -- Drop constraint first if it exists, then add it
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'buses_pwd_passengers_check'
    ) THEN
      ALTER TABLE buses DROP CONSTRAINT buses_pwd_passengers_check;
    END IF;
  END $$;

  ALTER TABLE buses
  ADD CONSTRAINT buses_pwd_passengers_check 
  CHECK (current_pwd_passengers <= pwd_seats);

  -- Add constraint to ensure pwd_seats_available is calculated correctly
  -- This will be maintained by the application, but we add a check constraint
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'buses_pwd_seats_available_check'
    ) THEN
      ALTER TABLE buses DROP CONSTRAINT buses_pwd_seats_available_check;
    END IF;
  END $$;

  ALTER TABLE buses
  ADD CONSTRAINT buses_pwd_seats_available_check 
  CHECK (pwd_seats_available >= 0 AND pwd_seats_available <= pwd_seats);

  -- Update existing buses to have default PWD seat values if they're NULL
  UPDATE buses
  SET 
    pwd_seats = COALESCE(pwd_seats, 4),
    current_pwd_passengers = COALESCE(current_pwd_passengers, 0),
    pwd_seats_available = COALESCE(pwd_seats_available, 4)
  WHERE pwd_seats IS NULL OR current_pwd_passengers IS NULL OR pwd_seats_available IS NULL;

  -- Create a function to automatically calculate pwd_seats_available when current_pwd_passengers changes
  -- This is a trigger function that will keep pwd_seats_available in sync
  CREATE OR REPLACE FUNCTION update_pwd_seats_available()
  RETURNS TRIGGER AS $$
  BEGIN
    -- Calculate available seats: total - current passengers
    NEW.pwd_seats_available := GREATEST(0, COALESCE(NEW.pwd_seats, 4) - COALESCE(NEW.current_pwd_passengers, 0));
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Create trigger to automatically update pwd_seats_available when current_pwd_passengers or pwd_seats changes
  DROP TRIGGER IF EXISTS trigger_update_pwd_seats_available ON buses;
  CREATE TRIGGER trigger_update_pwd_seats_available
  BEFORE INSERT OR UPDATE OF current_pwd_passengers, pwd_seats ON buses
  FOR EACH ROW
  EXECUTE FUNCTION update_pwd_seats_available();

  -- Verify the columns were added
  SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
  FROM information_schema.columns
  WHERE table_name = 'buses' 
    AND column_name IN ('pwd_seats', 'current_pwd_passengers', 'pwd_seats_available')
  ORDER BY column_name;

  -- Success message
  DO $$
  BEGIN
    RAISE NOTICE '✅ PWD seat columns added successfully to buses table!';
    RAISE NOTICE 'Columns: pwd_seats, current_pwd_passengers, pwd_seats_available';
    RAISE NOTICE 'Trigger created to auto-calculate pwd_seats_available';
  END $$;
