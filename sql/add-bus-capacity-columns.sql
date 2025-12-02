-- Add capacity tracking columns to buses table
-- Run this SQL in your Supabase SQL editor

-- Add capacity_percentage column (0-100)
ALTER TABLE buses 
ADD COLUMN IF NOT EXISTS capacity_percentage INTEGER DEFAULT 0 
CHECK (capacity_percentage >= 0 AND capacity_percentage <= 100);

-- Add current_passengers column
ALTER TABLE buses 
ADD COLUMN IF NOT EXISTS current_passengers INTEGER DEFAULT 0 
CHECK (current_passengers >= 0);

-- Add comment to columns for documentation
COMMENT ON COLUMN buses.capacity_percentage IS 'Current bus capacity as a percentage (0-100)';
COMMENT ON COLUMN buses.current_passengers IS 'Current number of passengers on the bus';

-- Update existing buses to have default values if they're NULL
UPDATE buses 
SET capacity_percentage = 0 
WHERE capacity_percentage IS NULL;

UPDATE buses 
SET current_passengers = 0 
WHERE current_passengers IS NULL;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'buses' 
  AND column_name IN ('capacity_percentage', 'current_passengers')
ORDER BY column_name;

