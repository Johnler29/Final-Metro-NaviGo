# "No Bus Assigned" Mismatch Issue - Explained

## Problem
The driver app shows "No Bus Assigned" but the admin portal shows the bus is assigned to the driver.

## Root Cause

The admin portal and driver app use **different logic** to determine if a bus is assigned:

### Admin Portal Logic
1. **Fleet Management page**: Shows driver based on `buses.driver_id` directly
   - If `buses.driver_id` is set → Shows as "Assigned"
   - Doesn't check `driver_bus_assignments` table at all

2. **Driver Management page**: Shows assignments from `driver_bus_assignments` table
   - Loads **ALL** assignments (regardless of `is_active` status)
   - Shows assignment if record exists, even if `is_active = false`

### Driver App Logic
- **Only** checks `driver_bus_assignments` table
- **Only** finds assignments where `is_active = true`
- If `is_active = false`, `NULL`, or assignment doesn't exist → Shows "No Bus Assigned"

## The Mismatch Scenarios

### Scenario 1: Assignment exists but `is_active = false`
- **Admin Portal**: Shows assigned (because `buses.driver_id` is set)
- **Driver App**: Shows "No Bus Assigned" (because `is_active != true`)
- **Fix**: Set `is_active = true` on the assignment

### Scenario 2: Assignment exists but `is_active = NULL`
- **Admin Portal**: Shows assigned (because `buses.driver_id` is set)
- **Driver App**: Shows "No Bus Assigned" (because `is_active != true`)
- **Fix**: Set `is_active = true` on the assignment

### Scenario 3: No assignment record exists
- **Admin Portal**: Shows assigned (because `buses.driver_id` is set)
- **Driver App**: Shows "No Bus Assigned" (because no assignment record exists)
- **Fix**: Create new assignment record with `is_active = true`

## How to Diagnose

Run the diagnostic script:
```sql
-- Run: sql/DIAGNOSE_NO_BUS_ASSIGNED_MISMATCH.sql
```

This will show:
1. What the admin portal sees (buses with `driver_id`)
2. What the driver app sees (active assignments only)
3. The exact mismatches
4. Specific checks for any driver (e.g., Paul Martinez)

## How to Fix

### Option 1: Activate Existing Inactive Assignments
If assignments exist but are inactive:
```sql
UPDATE driver_bus_assignments dba
SET 
  is_active = true,
  unassigned_at = NULL,
  updated_at = NOW()
FROM buses b
WHERE dba.bus_id = b.id
  AND dba.driver_id = b.driver_id
  AND b.driver_id IS NOT NULL
  AND (dba.is_active = false OR dba.is_active IS NULL);
```

### Option 2: Create Missing Assignments
If buses have `driver_id` but no assignment record:
```sql
INSERT INTO driver_bus_assignments (driver_id, bus_id, is_active, assigned_at)
SELECT 
  b.driver_id,
  b.id AS bus_id,
  true AS is_active,
  NOW() AS assigned_at
FROM buses b
WHERE b.driver_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM driver_bus_assignments dba 
    WHERE dba.driver_id = b.driver_id 
      AND dba.bus_id = b.id
  );
```

## Prevention

To prevent this issue in the future:

1. **When assigning a driver to a bus** (in admin portal):
   - Set `buses.driver_id`
   - **ALSO** create/update `driver_bus_assignments` with `is_active = true`

2. **When unassigning a driver from a bus**:
   - Set `buses.driver_id = NULL`
   - **ALSO** set `driver_bus_assignments.is_active = false`

3. **Consider using database triggers** to keep these in sync automatically

## Code Locations

- **Admin Portal - Fleet Management**: `admin-website/src/pages/FleetManagement.js` (line 395)
- **Admin Portal - Driver Management**: `admin-website/src/pages/DriverManagement.js` (line 36-38)
- **Driver App**: `screens/DriverHomeScreen.js` (line 124-128)

