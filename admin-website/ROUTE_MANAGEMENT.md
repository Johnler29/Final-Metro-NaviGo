# Route Management System

## Overview
The Route Management system is a comprehensive admin interface for managing bus routes, stops, and route configurations in the Navi-GO bus tracking application.

## Features

### Route Management
- **Create Routes**: Add new bus routes with complete details
- **Edit Routes**: Modify existing route information
- **Delete Routes**: Remove routes from the system
- **Search & Filter**: Find routes by name, number, origin, or destination
- **Status Management**: Toggle routes between active, inactive, and maintenance states
- **Sort Options**: Sort routes by various criteria (name, number, fare, etc.)

### Stop Management
- **Add Stops**: Create new stops for each route with precise GPS coordinates
- **Edit Stops**: Update stop details including name, address, and coordinates
- **Delete Stops**: Remove stops from routes
- **Reorder Stops**: Change the sequence of stops along a route
- **Visual Indicators**: Sequential numbering for easy stop identification

### Dashboard Statistics
- **Total Routes**: Overview of all routes in the system
- **Active Routes**: Count of currently operational routes
- **Total Stops**: Aggregate of all stops across routes
- **Average Fare**: Calculated average fare across all routes

## Route Data Structure

### Route Fields
```javascript
{
  id: "uuid",                    // Unique identifier
  route_number: "R001",          // Route identifier (e.g., R001, R002)
  name: "Dasmarinas to Alabang", // Route name
  description: "...",            // Route description
  origin: "Dasmarinas City",     // Starting point
  destination: "Alabang",        // End point
  fare: 25.00,                   // Route fare in PHP
  estimated_duration: 45,        // Duration in minutes
  status: "active",              // active | inactive | maintenance
  created_at: "timestamp",       // Creation timestamp
  updated_at: "timestamp"        // Last update timestamp
}
```

### Stop Fields
```javascript
{
  id: "uuid",                    // Unique identifier
  route_id: "uuid",              // Associated route ID
  name: "Imus Plaza",            // Stop name
  address: "Imus City Plaza",    // Stop address/description
  latitude: 14.3394,             // GPS latitude
  longitude: 120.9466,           // GPS longitude
  sequence: 1,                   // Order in route (1, 2, 3...)
  created_at: "timestamp"        // Creation timestamp
}
```

## Database Schema

### Routes Table
```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_number VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  origin VARCHAR(255),
  destination VARCHAR(255),
  fare DECIMAL(10,2) DEFAULT 0,
  estimated_duration INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Stops Table
```sql
CREATE TABLE stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Component Structure

### Main Components

#### 1. RouteManagement.js
Main page component that handles:
- Route listing and display
- Search and filtering
- Route CRUD operations
- Modal management
- Statistics display

**Key Functions:**
- `handleCreateRoute()`: Creates a new route
- `handleUpdateRoute()`: Updates existing route
- `handleDeleteRoute()`: Deletes a route
- `handleRefresh()`: Refreshes data from database

#### 2. RouteModal.js
Modal component for creating and editing routes:
- Form validation
- Field management
- Submit handling
- Error handling

**Props:**
- `route`: Route object (null for creation)
- `onClose`: Function to close modal
- `onSave`: Function to save route data

#### 3. StopManagementModal.js
Modal component for managing stops on a route:
- Add new stops
- Edit existing stops
- Delete stops
- Reorder stops
- Real-time updates

**Props:**
- `route`: Route object for stop management
- `onClose`: Function to close modal

## Usage Guide

### Adding a New Route

1. Navigate to **Route Management** from the sidebar
2. Click the **"Add Route"** button in the top-right corner
3. Fill in the route details:
   - Route Number (required) - e.g., "R001"
   - Route Name (required) - e.g., "Dasmarinas to Alabang"
   - Description (optional)
   - Origin and Destination
   - Fare (PHP)
   - Estimated Duration (minutes)
   - Status (active/inactive/maintenance)
4. Click **"Create Route"** to save

### Managing Stops for a Route

1. Find the route in the routes table
2. Click the three-dot menu (⋮) on the right
3. Select **"Manage Stops"**
4. In the Stop Management modal:
   - **Add New Stop**: Fill in the form at the top and click "Add Stop"
     - Stop Name (required)
     - Address (optional)
     - Latitude (required) - GPS coordinate
     - Longitude (required) - GPS coordinate
   - **Edit Stop**: Click the edit icon (✎) next to a stop
   - **Delete Stop**: Click the trash icon (🗑) next to a stop
   - **Reorder**: Use up (↑) and down (↓) arrows to change stop sequence
5. Click **"Done"** when finished

### Editing a Route

1. Find the route in the routes table
2. Click the three-dot menu (⋮) on the right
3. Select **"Edit Route"**
4. Modify the desired fields
5. Click **"Update Route"** to save changes

### Deleting a Route

1. Find the route in the routes table
2. Click the three-dot menu (⋮) on the right
3. Select **"Delete"**
4. Confirm the deletion in the popup dialog

**Note:** Deleting a route will also delete all associated stops due to CASCADE constraint.

### Search and Filter

#### Search
Use the search bar to find routes by:
- Route name
- Route number
- Origin city
- Destination city

#### Filter by Status
Select from the dropdown:
- **All Status**: Show all routes
- **Active**: Show only active routes
- **Inactive**: Show only inactive routes
- **Maintenance**: Show only routes under maintenance

#### Sort Options
Choose from various sorting options:
- Route Number (A-Z or Z-A)
- Name (A-Z or Z-A)
- Fare (Low-High or High-Low)

## Integration with App

The Route Management system integrates with the mobile app's route system defined in `/data/routes.js`:

### Data Flow
1. **Database First**: App tries to fetch routes from Supabase database
2. **Fallback**: If database is unavailable, app uses hardcoded routes from `routes.js`
3. **Transformation**: Database routes are transformed to app format using `transformDatabaseRoute()`

### Route Coordinates
Routes in the database store coordinates for path drawing on maps. When adding routes through the admin panel:
- Individual stops have precise GPS coordinates
- Full route paths can be defined separately (future feature)
- App interpolates between stops for basic routing

### Mobile App Functions
The following functions in `/data/routes.js` work with admin-created routes:
- `getAllRoutes()`: Fetches all routes (DB first, then fallback)
- `getRouteById()`: Gets specific route by ID
- `transformDatabaseRoute()`: Converts DB format to app format

## Best Practices

### Route Numbers
- Use consistent format (e.g., R001, R002, R003)
- Keep numbers sequential for easier management
- Don't reuse deleted route numbers

### Stop Coordinates
- Use accurate GPS coordinates from Google Maps or similar
- Verify coordinates correspond to actual bus stop locations
- Maintain consistent precision (6-8 decimal places)

### Stop Sequencing
- Number stops in logical order from origin to destination
- Keep sequence numbers continuous (1, 2, 3...)
- Reorder stops if route changes

### Route Status
- **Active**: Route is operational and visible to users
- **Inactive**: Route temporarily disabled (seasonal, low demand)
- **Maintenance**: Route under maintenance or updates

### Fare Setting
- Set fares based on distance and operational costs
- Update fares consistently across similar routes
- Consider distance-based pricing

## API Endpoints (Supabase)

### Routes
```javascript
// Get all routes
supabase.from('routes').select('*')

// Get route by ID
supabase.from('routes').select('*').eq('id', routeId).single()

// Create route
supabase.from('routes').insert([routeData]).select()

// Update route
supabase.from('routes').update(updates).eq('id', routeId).select()

// Delete route
supabase.from('routes').delete().eq('id', routeId)
```

### Stops
```javascript
// Get stops for route
supabase.from('stops').select('*').eq('route_id', routeId).order('sequence')

// Create stop
supabase.from('stops').insert([stopData]).select()

// Update stop
supabase.from('stops').update(updates).eq('id', stopId)

// Delete stop
supabase.from('stops').delete().eq('id', stopId)
```

## Real-time Updates

The system uses Supabase real-time subscriptions to automatically update:
- Route list when routes are added/edited/deleted
- Stop list when stops are modified
- Statistics when data changes

No manual refresh needed - changes appear instantly across all admin sessions.

## Troubleshooting

### Routes Not Appearing in App
1. Verify route status is "active"
2. Check that route has at least 2 stops
3. Confirm stop coordinates are valid
4. Check Supabase connection in app

### Stops Not Saving
1. Ensure latitude and longitude are valid numbers
2. Verify route_id exists
3. Check for duplicate sequence numbers
4. Review Supabase permissions

### Cannot Delete Route
1. Check for associated buses on the route
2. Verify admin permissions
3. Review database constraints

## Future Enhancements

- [ ] Visual route path editor with map integration
- [ ] Bulk import/export of routes and stops
- [ ] Route duplication feature
- [ ] Historical route performance data
- [ ] Route optimization suggestions
- [ ] Integration with Google Maps Directions API
- [ ] Real-time traffic integration
- [ ] Passenger demand heat maps
- [ ] Route scheduling integration

## Related Documentation
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [System Design Review](../SYSTEM_DESIGN_REVIEW.md)
- [Admin Website Setup](./SETUP.md)

## Support
For issues or questions about the Route Management system, please refer to the main project documentation or contact the development team.

