# Fix "N/A" Showing in Driver App

## Quick Fix Steps

### Step 1: Run the Fix Script
Run `sql/FIX_DRIVER_APP_N_A.sql` which will:
- Check current state
- Fix all inactive assignments
- Create missing assignments
- Fix driver_id mismatches
- Verify the fix worked

### Step 2: Check the Results
After running the script, **STEP 3** should show:
```
✅ ALL FIXED - App should now show bus numbers
```

**STEP 4** should show your driver with the bus number (not "N/A").

### Step 3: Refresh the Driver App

**IMPORTANT**: The app caches data, so you MUST refresh it:

#### Option A: Restart the App (Recommended)
1. **Completely close** the driver app
2. **Reopen** the app
3. **Log in** again
4. Check if bus number appears

#### Option B: Force Refresh (If restart doesn't work)
1. In the app, go to **Profile** screen
2. **Pull down** to refresh (if available)
3. Or **log out and log back in**

#### Option C: Clear App Data (Last Resort)
1. Go to device **Settings** → **Apps** → Your app
2. **Clear cache** and **Clear data**
3. **Reopen** the app and log in

### Step 4: Check Console Logs

If it still shows "N/A", check the app console logs for:

```
🔍 Loading bus assignment for driver: [driver_id] [driver_name]
📋 Available assignments: [number]
```

Look for:
- `✅ Found matching assignment:` → Should show assignment details
- `❌ No assignment found` → Assignment still not found

## Common Issues After Fix

### Issue 1: App Still Shows N/A After Database Fix
**Cause**: App is using cached data  
**Fix**: Restart the app (Step 3 above)

### Issue 2: Assignment Exists But App Doesn't Find It
**Check**: Run this query to see what the app should see:
```sql
-- Replace 'Your Driver Name' with actual driver name
SELECT 
  d.name AS driver_name,
  dba.is_active,
  b.bus_number,
  CASE 
    WHEN dba.is_active = true THEN '✅ App should find this'
    ELSE '❌ App will NOT find this'
  END AS status
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
INNER JOIN buses b ON b.id = dba.bus_id
WHERE d.name = 'Your Driver Name';
```

### Issue 3: is_active is Still Not True
**Check**: 
```sql
SELECT id, driver_id, bus_id, is_active 
FROM driver_bus_assignments 
WHERE driver_id = 'your_driver_id';
```

If `is_active` is not exactly `true`, run the fix script again.

### Issue 4: Driver ID Mismatch
**Check**: The app uses strict comparison (`===`), so IDs must match exactly:
```sql
-- Check if IDs match
SELECT 
  d.id::text AS driver_id,
  dba.driver_id::text AS assignment_driver_id,
  CASE 
    WHEN d.id::text = dba.driver_id::text THEN '✅ Match'
    ELSE '❌ Mismatch'
  END AS match_status
FROM drivers d
INNER JOIN driver_bus_assignments dba ON dba.bus_id IN (
  SELECT id FROM buses WHERE driver_id = d.id
)
WHERE d.name = 'Your Driver Name';
```

## Still Not Working?

If after running the fix and restarting the app it still shows "N/A":

1. **Check the exact driver ID** from app logs
2. **Run this diagnostic**:
   ```sql
   -- Replace with driver ID from app logs
   SELECT 
     d.id,
     d.name,
     dba.id AS assignment_id,
     dba.is_active,
     b.bus_number
   FROM drivers d
   LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text AND dba.is_active = true
   LEFT JOIN buses b ON b.id = dba.bus_id
   WHERE d.id::text = 'driver_id_from_app_logs';
   ```

3. **Verify**:
   - Assignment exists (`assignment_id` is not NULL)
   - `is_active` is exactly `true` (not 'true', not 1, not NULL)
   - Bus exists (`bus_number` is not NULL)

4. **If all checks pass but app still shows N/A**: The app might need a code update to handle edge cases. Check the console logs for specific error messages.

