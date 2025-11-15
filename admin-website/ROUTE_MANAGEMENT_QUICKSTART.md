# Route Management - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Access Route Management
1. Start the admin website: `npm start` (from admin-website directory)
2. Login to the admin panel
3. Click **"Route Management"** in the sidebar (Navigation icon)

### Step 2: Create Your First Route
1. Click the **"Add Route"** button (top-right corner)
2. Fill in the form:
   ```
   Route Number: R001
   Route Name: City Center Express
   Origin: Downtown Station
   Destination: Airport Terminal
   Fare: 35.00
   Duration: 30
   Status: Active
   ```
3. Click **"Create Route"**
4. ✅ Route created! You'll see it in the table

### Step 3: Add Stops to Your Route
1. Find your route in the table
2. Click the three-dot menu (⋮) on the right
3. Select **"Manage Stops"**
4. Add your first stop:
   ```
   Stop Name: Downtown Station
   Address: Main Street, City Center
   Latitude: 14.5995
   Longitude: 120.9842
   ```
5. Click **"Add Stop"**
6. Repeat for more stops:
   ```
   Stop 2: Mall Junction
   - Latitude: 14.6095
   - Longitude: 120.9942
   
   Stop 3: Business Park
   - Latitude: 14.6195
   - Longitude: 121.0042
   
   Stop 4: Airport Terminal
   - Latitude: 14.6295
   - Longitude: 121.0142
   ```
7. Click **"Done"**

### Step 4: Test Your Route
1. View route in the table - shows 4 stops
2. Try searching for "Express"
3. Filter by status "Active"
4. Check the statistics dashboard

### Step 5: Edit and Manage
**Edit a route:**
- Click ⋮ → Edit Route
- Change fare to 40.00
- Click "Update Route"

**Reorder stops:**
- Click ⋮ → Manage Stops
- Use ↑↓ arrows to reorder
- Watch sequence update automatically

**Edit a stop:**
- Click the edit icon (✎)
- Modify details
- Click outside to save

## 🎯 Common Tasks

### Create Multiple Routes Quickly
```
Route 1: R001 - Downtown to Airport (₱35, 30min, 4 stops)
Route 2: R002 - Market to Port (₱25, 20min, 3 stops)
Route 3: R003 - University Loop (₱15, 15min, 5 stops)
```

### Getting GPS Coordinates
1. Open Google Maps
2. Right-click on location
3. Click on coordinates to copy
4. Paste into latitude/longitude fields

### Change Route Status
- **Active**: Route is operational
- **Inactive**: Temporarily disabled
- **Maintenance**: Under maintenance

## 📊 Understanding the Dashboard

### Statistics Cards
- **Total Routes**: All routes in system
- **Active Routes**: Currently operational
- **Total Stops**: All stops across routes
- **Average Fare**: Calculated from all routes

### Search Bar
Search for routes by:
- Route name: "Express"
- Route number: "R001"
- Origin: "Downtown"
- Destination: "Airport"

### Filters
- **Status Filter**: active/inactive/maintenance
- **Sort Options**: by name, number, fare, etc.

## 🔄 Data Sync with Mobile App

Your routes will automatically sync with the mobile app:
1. Route appears in app route list
2. Stops display on map
3. Users can track buses on this route
4. Real-time updates work instantly

## ⚡ Pro Tips

### Efficient Route Creation
1. Create route first
2. Add all stops in order
3. Verify on map (in app)
4. Adjust fares based on distance

### Stop Naming Convention
- Use clear, recognizable names
- Include landmarks: "Near City Hall"
- Be consistent: "Station", not "Stn"

### Coordinate Precision
- Use 6-8 decimal places
- Example: 14.599512 (6 decimals)
- More precision = more accurate

### Route Numbering
- Use consistent format: R001, R002
- Keep sequential: R001, R002, R003
- Don't skip numbers

### Organizing Routes
- Group by area: R001-R099 (North)
- By type: R100-R199 (Express)
- By destination: R200-R299 (Airport)

## 🎨 UI Quick Reference

### Icons Used
- **Navigation** (📐): Routes section
- **Plus** (+): Add new
- **Edit** (✎): Modify
- **Trash** (🗑): Delete
- **List** (☰): Manage stops
- **Up/Down** (↑↓): Reorder
- **MapPin** (📍): Location

### Color Coding
- 🟢 **Green**: Active status
- 🟡 **Yellow**: Maintenance
- ⚪ **Gray**: Inactive
- 🔵 **Blue**: Statistics
- 🟣 **Purple**: Stops

## 🐛 Troubleshooting

### Route not saving
- Check required fields (marked with *)
- Verify route number is unique
- Ensure valid fare/duration

### Stop not adding
- Latitude/longitude must be numbers
- Use decimal format (14.5995)
- Don't use commas in numbers

### Can't delete route
- Check if buses are on this route
- Verify you have permissions
- Try refreshing the page

### Changes not appearing
- Check internet connection
- Refresh the page (F5)
- Verify Supabase is online

## 📱 Mobile App Integration

### View Your Routes in App
1. Open mobile app
2. Go to Routes tab
3. Your new routes appear
4. Click to view stops

### Test Bus Tracking
1. Create route with stops
2. Assign bus to route (Fleet Management)
3. Driver starts trip (Mobile app)
4. Track in real-time

## 🎓 Learning Path

### Beginner (10 minutes)
1. Create 1 route
2. Add 3 stops
3. Edit route details
4. Delete a stop

### Intermediate (30 minutes)
1. Create 5 different routes
2. Add multiple stops each
3. Use search and filters
4. Reorder stops
5. Change route status

### Advanced (1 hour)
1. Create complete route network
2. Organize by area/type
3. Set accurate GPS coordinates
4. Test in mobile app
5. Optimize based on usage

## 📝 Checklist for Complete Route

- [ ] Route has unique number
- [ ] Route has descriptive name
- [ ] Origin and destination set
- [ ] Fare is appropriate
- [ ] Duration is realistic
- [ ] Status is "active"
- [ ] At least 2 stops added
- [ ] Stops in correct order
- [ ] All GPS coordinates valid
- [ ] Tested in mobile app

## 🚦 Next Steps

After mastering basic route management:

1. **Fleet Management**: Assign buses to routes
2. **Schedule Management**: Set departure times
3. **Driver Management**: Assign drivers
4. **User Management**: Monitor passengers
5. **Analytics**: View route performance

## 📚 Additional Resources

- [Full Route Management Guide](./ROUTE_MANAGEMENT.md)
- [Implementation Summary](./ROUTE_MANAGEMENT_SUMMARY.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [System Design](../SYSTEM_DESIGN_REVIEW.md)

## 💡 Need Help?

Common questions:
- **Q**: How many routes can I create?
- **A**: Unlimited! System scales automatically

- **Q**: Can I import routes from CSV?
- **A**: Coming soon! For now, create manually

- **Q**: Can I see routes on a map in admin?
- **A**: Future feature! Currently view in mobile app

- **Q**: What if I make a mistake?
- **A**: All actions can be edited or deleted

- **Q**: How do I backup my routes?
- **A**: Routes stored in Supabase (auto-backed up)

## ✅ You're Ready!

You now know how to:
- ✅ Create and manage routes
- ✅ Add and organize stops
- ✅ Search and filter routes
- ✅ Edit and delete data
- ✅ Sync with mobile app

Start creating your bus route network now! 🚌

