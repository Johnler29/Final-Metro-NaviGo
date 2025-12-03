# Status Fields Explained

This document explains what all the "status" fields mean in the bus tracking system.

## Database Status Fields

### 1. `buses.status` (Bus Status)
**What it means:** Whether the bus is currently active or inactive in the system.

**Possible values:**
- `'active'` - Bus is operational and should be tracked
- `'inactive'` - Bus is offline/not in service (should NOT appear on map)

**When it changes:**
- ✅ **Goes to `'active'`** when driver goes "On Duty"
- ❌ **Goes to `'inactive'`** when driver goes "Off Duty"

**In the code:** This is what we check to determine if a bus should be visible on the map.

---

### 2. `drivers.status` (Driver Status)
**What it means:** Whether the driver is currently on duty or off duty.

**Possible values:**
- `'active'` - Driver is on duty and driving
- `'inactive'` - Driver is off duty (their bus should be hidden)
- `'on_leave'` - Driver is on leave

**When it changes:**
- ✅ **Goes to `'active'`** when driver taps "Go On Duty"
- ❌ **Goes to `'inactive'`** when driver taps "Go Off Duty"

---

### 3. `buses.tracking_status` (Location Tracking Status)
**What it means:** Whether the bus is currently moving, stopped, or offline.

**Possible values:**
- `'moving'` - Bus is moving and sending location updates
- `'stopped'` - Bus is stopped but still tracking
- `'offline'` - Bus is not sending location updates

**When it changes:**
- Automatically based on GPS movement
- Set to `'stopped'` when driver goes off duty

---

## How Status Fields Work Together

### Bus is VISIBLE on map when:
```
buses.status = 'active' 
AND buses.driver_id IS NOT NULL 
AND drivers.status = 'active'
```

### Bus is HIDDEN from map when:
```
buses.status = 'inactive' 
OR buses.driver_id IS NULL 
OR drivers.status = 'inactive'
```

---

## Status Indicators in Queries

When you see these in the monitoring queries:

### ✅ Status Indicators:
- `'✅ Active with Driver'` - Bus is active, has a driver, should be visible
- `'✅ Correctly Inactive'` - Bus is inactive, no driver, correctly hidden
- `'✅ Live'` - Bus has recent location updates (< 10 minutes old)
- `'✅ VISIBLE on map'` - All conditions met for map visibility

### ⚠️ Warning Indicators:
- `'⚠️ Active but No Driver'` - Bus marked active but no driver assigned (problem!)
- `'⚠️ Inactive but Still Has Driver'` - Bus inactive but driver still assigned (problem!)
- `'⚠️ Bus Active but Driver Inactive'` - Mismatch between bus and driver status (problem!)
- `'⚠️ Stale Location'` - No location update in >10 minutes

### 🚫 Hidden Indicators:
- `'🚫 Inactive'` - Bus is inactive, should be hidden
- `'🚫 HIDDEN from map'` - Bus should not appear on user's map

---

## Example: Driver Goes Off Duty

**Before (Bus Visible):**
```
buses.status = 'active'
buses.driver_id = '123'
drivers.status = 'active'
→ Bus appears on map ✅
```

**After (Bus Hidden):**
```
buses.status = 'inactive'        ← Changed!
buses.driver_id = NULL          ← Changed!
drivers.status = 'inactive'     ← Changed!
→ Bus disappears from map 🚫
```

---

## Quick Reference

| Field | Active Value | Inactive Value | What It Controls |
|-------|-------------|----------------|------------------|
| `buses.status` | `'active'` | `'inactive'` | Whether bus is in service |
| `drivers.status` | `'active'` | `'inactive'` | Whether driver is on duty |
| `buses.tracking_status` | `'moving'` or `'stopped'` | `'offline'` | GPS tracking state |
| `buses.driver_id` | `'uuid-here'` | `NULL` | Which driver is assigned |

---

## Monitoring Queries Explained

### Query #1: "CURRENT BUS STATUS OVERVIEW"
Shows all buses with their current status values. Use this to see the current state of everything.

### Query #2: "ACTIVE BUSES WITH DRIVERS"
Shows only buses that **should be visible** on the map. If a bus is here, users can see it.

### Query #3: "INACTIVE BUSES"
Shows buses that **should be hidden** from the map. If a bus is here, users should NOT see it.

### Query #8: "QUICK HEALTH CHECK"
One query that shows if everything is working correctly. All metrics should show ✅ if healthy.

---

## Common Issues to Watch For

1. **Bus active but no driver** (`status='active'` but `driver_id=NULL`)
   - Problem: Bus shouldn't be active without a driver
   - Fix: Set bus status to 'inactive'

2. **Driver inactive but still assigned** (`driver.status='inactive'` but `bus.driver_id` still set)
   - Problem: Driver went off duty but bus still shows them as driver
   - Fix: Set `bus.driver_id = NULL` and `bus.status = 'inactive'`

3. **Bus inactive but has driver** (`status='inactive'` but `driver_id` is not NULL)
   - Problem: Inconsistent state
   - Fix: Set `driver_id = NULL` when bus goes inactive

---

## How to Check Status

Run this simple query to see current status:
```sql
SELECT 
  b.id,
  b.name,
  b.status AS bus_status,
  d.name AS driver_name,
  d.status AS driver_status,
  CASE 
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' 
    THEN '✅ VISIBLE'
    ELSE '🚫 HIDDEN'
  END AS map_visibility
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id;
```

This shows you exactly which buses should be visible and which should be hidden based on their status values.

