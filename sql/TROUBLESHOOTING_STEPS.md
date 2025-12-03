# Troubleshooting "No Bus Assigned" Issue

If the fix didn't work, follow these steps:

## Step 1: Verify the Database Fix

Run `sql/VERIFY_AND_FIX_ASSIGNMENT.sql` which will:
- Check current state
- Fix all issues automatically
- Show what the driver app should see

## Step 2: Check the Results

After running the verification script, check:
1. **STEP 4** should show `✅ ALL FIXED`
2. **STEP 5** should show `✅ Driver app WILL find this` for your driver

## Step 3: Refresh the Driver App

The app might be caching old data. Try:

### Option A: Restart the App
1. Close the driver app completely
2. Reopen it
3. Log in again

### Option B: Clear App Data (if restart doesn't work)
1. In the app, go to Settings/Profile
2. Log out
3. Clear app cache/data (device settings)
4. Log back in

### Option C: Force Refresh in Code
If you have access to the code, the app should automatically refresh when:
- The component remounts
- The `driverBusAssignments` context updates
- The app reconnects to Supabase

## Step 4: Check Console Logs

In the driver app, check the console logs for:
- `🔍 Loading bus assignment for driver: [driver_id] [driver_name]`
- `📋 Available assignments: [number]`
- `✅ Found matching assignment:` or `❌ No assignment found`

Look for these specific issues:

### Issue 1: Driver ID Mismatch
If you see logs like:
```
driver_id_from_assignment: [different_id]
driver_id_looking_for: [your_id]
```
This means the assignment has the wrong driver_id.

**Fix**: Run the verification script again - it fixes type mismatches.

### Issue 2: is_active is not true
If you see:
```
is_active: false
```
or
```
is_active: null
```

**Fix**: The verification script should have fixed this, but if not, manually run:
```sql
UPDATE driver_bus_assignments
SET is_active = true, unassigned_at = NULL
WHERE driver_id = '[your_driver_id]' AND bus_id = '[your_bus_id]';
```

### Issue 3: No assignments loaded
If you see:
```
📋 Available assignments: 0
```

**Possible causes**:
1. The app hasn't loaded assignments yet (wait a few seconds)
2. The Supabase connection failed
3. RLS (Row Level Security) is blocking the query

**Fix**: Check Supabase RLS policies for `driver_bus_assignments` table.

## Step 5: Verify RLS Policies

The driver app needs to read from `driver_bus_assignments`. Check if RLS is enabled and if there's a policy allowing drivers to read their own assignments:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'driver_bus_assignments';

-- Check existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'driver_bus_assignments';
```

If RLS is blocking, you may need to add a policy like:
```sql
CREATE POLICY "Drivers can view their own assignments"
ON driver_bus_assignments
FOR SELECT
USING (auth.uid()::text = driver_id::text);
```

## Step 6: Manual Database Check

Run this to see exactly what the driver app should find:

```sql
-- Replace 'YOUR_DRIVER_ID' with the actual driver ID from the app logs
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  dba.id AS assignment_id,
  dba.is_active,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN dba.is_active = true THEN '✅ Should work'
    ELSE '❌ Problem: is_active is not true'
  END AS status
FROM drivers d
LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text AND dba.is_active = true
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE d.id::text = 'YOUR_DRIVER_ID';
```

## Step 7: Check for Multiple Assignments

Sometimes there are duplicate assignments, and the app might find the wrong one:

```sql
-- Check for duplicates
SELECT 
  driver_id,
  bus_id,
  COUNT(*) AS count,
  STRING_AGG(id::text, ', ') AS assignment_ids
FROM driver_bus_assignments
WHERE is_active = true
GROUP BY driver_id, bus_id
HAVING COUNT(*) > 1;
```

If duplicates exist, run `sql/FIX_DUPLICATE_ASSIGNMENTS.sql`.

## Still Not Working?

If none of the above works:

1. **Check the exact driver ID** from the app logs
2. **Check the exact assignment** in the database for that driver
3. **Compare** the driver_id values (they must match exactly, including type)
4. **Check** if `is_active` is exactly `true` (not `'true'` string, not `1`, not `NULL`)

The most common issue is that `is_active` is `false` or `NULL` instead of `true`.

