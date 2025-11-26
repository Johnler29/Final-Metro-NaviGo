# Bus Route Stops - GPS Coordinates

## Northbound Route: Dasmarinas → Cubao

Based on your bus manifest, here are the GPS coordinates for each stop:

### Stop 1: OPENING TICKET
- **Name**: OPENING TICKET
- **Address**: Robinson's Place Dasmarinas, Dasmarinas City, Cavite
- **Latitude**: `14.3290`
- **Longitude**: `120.9367`
- **Description**: The point where the conductor opens the ticket booklet (start of trip)
- **Note**: Robinson's Dasmarinas terminal location

### Stop 2: CARMONA EXIT
- **Name**: CARMONA EXIT
- **Address**: SLEX Carmona Exit, Carmona, Cavite
- **Latitude**: `14.3139`
- **Longitude**: `121.0575`
- **Description**: Common checkpoint for Cavite-bound buses
- **Note**: SLEX Exit 34 location

### Stop 3: CENTENNIAL
- **Name**: CENTENNIAL
- **Address**: Centennial Road, Cavite
- **Latitude**: `14.4795`
- **Longitude**: `120.8960`
- **Description**: Centennial area in GMA/Carmona corridor
- **Note**: Centennial Road area

### Stop 4: EASTWOOD
- **Name**: EASTWOOD
- **Address**: Eastwood City / Libis, Quezon City
- **Latitude**: `14.6091`
- **Longitude**: `121.0805`
- **Description**: Major stop on C5 (Commonwealth Avenue)
- **Note**: Eastwood City commercial district

### Stop 5: CUBAO
- **Name**: CUBAO
- **Address**: Araneta City Bus Port, Cubao, Quezon City
- **Latitude**: `14.6180`
- **Longitude**: `121.0560`
- **Description**: Main terminal for Cubao-bound trips
- **Note**: Araneta Center/Cubao area

---

## How to Use These Coordinates

### Option 1: Add via Admin Website (Recommended)
1. Go to **Route Management** in your admin website
2. Create or select your route
3. Click **⋮ → Manage Stops**
4. Add each stop with the coordinates above

### Option 2: Add via SQL (Direct Database)
1. Open Supabase SQL Editor
2. Run the SQL from `sql/add-bus-route-stops.sql`
3. Adjust the `route_id` or `route_number` to match your route

### Option 3: Verify Coordinates First
1. Open Google Maps
2. Right-click on each location
3. Click the coordinates to copy
4. Update the values if different

---

## Important Notes

⚠️ **VERIFY COORDINATES**: These coordinates are approximate based on general locations. For accurate bus tracking, you should:

1. **Use Google Maps** to find the exact bus stop locations
2. **Right-click** on the exact spot where buses stop
3. **Copy the coordinates** (they'll be in decimal format)
4. **Update** the coordinates in your database

### How to Get Exact Coordinates from Google Maps:
1. Open [Google Maps](https://www.google.com/maps)
2. Search for the location (e.g., "Carmona Exit SLEX")
3. Right-click on the exact bus stop location
4. Click on the coordinates that appear (e.g., "14.3135, 121.0151")
5. Copy the coordinates
6. Use them in your database

---

## Southbound Route (Reverse Order)

If you also need the **SOUTH BOUND** route (Cubao → Dasmarinas), the stops would be in reverse order:

1. CUBAO (14.6180, 121.0560)
2. EASTWOOD (14.6096, 121.0800)
3. CENTENNIAL (14.4321, 120.8987)
4. CARMONA EXIT (14.3135, 121.0151)
5. OPENING TICKET (14.3294, 120.9366) - or SM DASMA if different

---

## Quick Reference Table

| Stop | Name | Latitude | Longitude | Sequence |
|------|------|----------|-----------|----------|
| 1 | OPENING TICKET | 14.3290 | 120.9367 | 1 |
| 2 | CARMONA EXIT | 14.3139 | 121.0575 | 2 |
| 3 | CENTENNIAL | 14.4795 | 120.8960 | 3 |
| 4 | EASTWOOD | 14.6091 | 121.0805 | 4 |
| 5 | CUBAO | 14.6180 | 121.0560 | 5 |

---

## Next Steps

1. ✅ Verify coordinates using Google Maps
2. ✅ Create route in admin website or database
3. ✅ Add stops with verified coordinates
4. ✅ Test route in mobile app
5. ✅ Adjust coordinates if needed based on actual bus stops

---

## Need Help?

- **Coordinates seem wrong?** Use Google Maps to verify
- **Can't find "Opening Ticket"?** It's at Robinson's Place Dasmarinas - the terminal location
- **Need to add more stops?** Use the same format in the SQL file or admin website

