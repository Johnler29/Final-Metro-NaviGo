# Health Check Dashboard Explained

This document explains what each metric in the Health Check query means and what the warnings indicate.

## Dashboard Metrics Breakdown

### 1. ✅ Total Buses: 3
**What it means:** Total number of buses in your database.

**Status:**
- ✅ Green checkmark = You have buses in the system (good!)
- ⚠️ Warning = No buses found (problem - check database)

**Your result:** ✅ **3 buses** - This is good!

---

### 2. ✅ Active Buses with Drivers: 3
**What it means:** Number of buses that are:
- `status = 'active'`
- Have a driver assigned (`driver_id` is not NULL)
- Driver is also active (`drivers.status = 'active'`)

**Status:**
- ✅ Green checkmark = Buses are active and have drivers (good!)
- ⚠️ Warning = No active buses with drivers (problem - no buses on the road)

**Your result:** ✅ **3 buses** - All your buses are active and have drivers!

**This means:** These 3 buses **SHOULD be visible** on the user's map.

---

### 3. ⚠️ Inactive Buses: 0
**What it means:** Number of buses that are:
- `status = 'inactive'`
- OR have no driver assigned (`driver_id` IS NULL)

**Status:**
- ✅ Green checkmark = You have some inactive buses (normal - buses go off duty)
- ⚠️ Warning = No inactive buses (might be unusual if you expect some to be off duty)

**Your result:** ⚠️ **0 buses** - This warning is actually **OK** if all your buses are currently in service.

**Note:** This warning is a bit misleading. Having 0 inactive buses is fine if all buses are currently on duty. The warning appears because the query expects there might be some inactive buses, but it's not necessarily a problem.

---

### 4. ⚠️ Buses with Recent Location Updates: 0
**What it means:** Number of buses that have updated their location in the **last 10 minutes**.

**Status:**
- ✅ Green checkmark = Buses are sending location updates (GPS working!)
- ⚠️ Warning = **NO buses are sending location updates** (GPS NOT working!)

**Your result:** ⚠️ **0 buses** - **THIS IS THE PROBLEM!**

**What this means:**
- No buses are currently sending GPS location updates
- The `last_location_update` field hasn't been updated in the last 10 minutes
- Users won't see bus locations on the map (even though buses are active)

**Possible causes:**
1. **Drivers haven't started location tracking** - They need to:
   - Go "On Duty" in the app
   - Grant GPS permissions
   - Wait for GPS to acquire location

2. **GPS permissions not granted** - Check device settings

3. **Location services disabled** - Check device location settings

4. **App not sending updates** - Check if location tracking is running

5. **Database function not updating** - The `update_bus_location_simple()` function might not be working

---

### 5. ✅ Orphaned Buses (Active but No Driver): 0
**What it means:** Number of buses that are:
- `status = 'active'`
- BUT have no driver assigned (`driver_id` IS NULL)

**Status:**
- ✅ Green checkmark = No orphaned buses (good - all active buses have drivers)
- ⚠️ Warning = Some active buses don't have drivers (problem - inconsistent state)

**Your result:** ✅ **0 buses** - Perfect! All active buses have drivers assigned.

---

## Summary of Your Dashboard

| Metric | Value | Status | Meaning |
|--------|-------|--------|---------|
| Total Buses | 3 | ✅ | You have 3 buses in system |
| Active with Drivers | 3 | ✅ | All 3 buses are active and have drivers |
| Inactive Buses | 0 | ⚠️ | No buses off duty (OK if all are in service) |
| **Recent Location Updates** | **0** | **⚠️** | **NO GPS tracking - THIS IS THE ISSUE!** |
| Orphaned Buses | 0 | ✅ | All active buses have drivers |

---

## What You Need to Fix

### Main Issue: No Location Updates

**To fix this, check:**

1. **Are drivers actually "On Duty"?**
   - Check the driver app
   - Verify they tapped "Go On Duty"
   - Check if location tracking started

2. **Check GPS permissions:**
   - Drivers need to grant location permissions
   - Check device settings → Apps → Your App → Permissions

3. **Check if location updates are being sent:**
   - Run this query to see when buses last updated:
   ```sql
   SELECT 
     id, 
     name, 
     last_location_update,
     EXTRACT(EPOCH FROM (NOW() - last_location_update)) / 60 AS minutes_ago
   FROM buses
   WHERE status = 'active';
   ```

4. **Check the database function:**
   - Verify `update_bus_location_simple()` function exists
   - Check if it has proper permissions

5. **Check app logs:**
   - Look for location update errors in the driver app
   - Check console for GPS permission errors

---

## Expected Behavior

**When everything is working correctly, you should see:**
- ✅ Active Buses with Drivers: 3
- ✅ Buses with Recent Location Updates: 3 (or however many are active)
- ✅ Inactive Buses: 0 (or some number if buses are off duty)

**Right now you have:**
- ✅ Active Buses with Drivers: 3
- ⚠️ Buses with Recent Location Updates: 0 ← **Fix this!**
- ⚠️ Inactive Buses: 0 (this is OK)

---

## Quick Diagnostic Query

Run this to see exactly what's happening with location updates:

```sql
SELECT 
  b.id,
  b.name,
  b.status,
  b.driver_id,
  d.name AS driver_name,
  b.last_location_update,
  CASE 
    WHEN b.last_location_update IS NULL THEN '❌ Never Updated'
    WHEN b.last_location_update < NOW() - INTERVAL '30 minutes' THEN '🔴 Very Old (>30 min)'
    WHEN b.last_location_update < NOW() - INTERVAL '10 minutes' THEN '🟠 Stale (>10 min)'
    ELSE '✅ Recent'
  END AS update_status,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(b.last_location_update, NOW()))) / 60 AS minutes_ago
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active'
ORDER BY b.last_location_update DESC NULLS LAST;
```

This will show you exactly which buses are missing location updates and how old their last update was.


