// Route data with coordinates for bus routes
// All routes are now managed through the admin website and stored in the database
// Mock/fallback routes have been removed

export const FALLBACK_ROUTES = {};

// Helper function to get route by ID (fallback only)
export const getRouteByIdFallback = (routeId) => {
  return FALLBACK_ROUTES[routeId] || null;
};

// Helper function to get all routes (fallback only)
export const getAllRoutesFallback = () => {
  return Object.values(FALLBACK_ROUTES);
};

// Helper function to get routes by origin
export const getRoutesByOrigin = (origin) => {
  return Object.values(FALLBACK_ROUTES).filter(route => 
    route.origin.toLowerCase().includes(origin.toLowerCase())
  );
};

// Helper function to get routes by destination
export const getRoutesByDestination = (destination) => {
  return Object.values(FALLBACK_ROUTES).filter(route => 
    route.destination.toLowerCase().includes(destination.toLowerCase())
  );
};

// Function to transform database route to app format
export const transformDatabaseRoute = (dbRoute) => {
  // Transform stops first
  const transformedStops = (dbRoute.stops || []).map(stop => ({
    id: stop.id,
    name: stop.stop_name || stop.name,
    description: stop.stop_description || stop.description || stop.address,
    latitude: parseFloat(stop.latitude),
    longitude: parseFloat(stop.longitude),
    stop_order: stop.stop_order || stop.sequence,
    is_active: true
  })).sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));

  // If no route coordinates, generate from stops
  let coordinates = dbRoute.route_coordinates || [];
  if (!coordinates || coordinates.length === 0) {
    // Generate coordinates from stops (simple path)
    coordinates = transformedStops.map(stop => ({
      latitude: stop.latitude,
      longitude: stop.longitude
    }));
    
    // If we have at least 2 stops, interpolate points between them for smoother path
    if (transformedStops.length >= 2) {
      const interpolatedCoords = [];
      for (let i = 0; i < transformedStops.length - 1; i++) {
        const start = transformedStops[i];
        const end = transformedStops[i + 1];
        
        // Add start point
        interpolatedCoords.push({ latitude: start.latitude, longitude: start.longitude });
        
        // Add 3 interpolated points between stops for smoother curve
        for (let j = 1; j <= 3; j++) {
          const ratio = j / 4;
          interpolatedCoords.push({
            latitude: start.latitude + (end.latitude - start.latitude) * ratio,
            longitude: start.longitude + (end.longitude - start.longitude) * ratio
          });
        }
      }
      // Add final stop
      const lastStop = transformedStops[transformedStops.length - 1];
      interpolatedCoords.push({ latitude: lastStop.latitude, longitude: lastStop.longitude });
      
      coordinates = interpolatedCoords;
    }
  }

  return {
    id: dbRoute.id,
    name: dbRoute.name,
    origin: dbRoute.origin || dbRoute.start_location,
    destination: dbRoute.destination || dbRoute.end_location,
    routeNumber: dbRoute.route_number,
    color: dbRoute.route_color || '#3B82F6',
    strokeWidth: dbRoute.stroke_width || 5,
    estimatedDuration: dbRoute.estimated_duration || 0,
    fare: parseFloat(dbRoute.fare) || 0,
    coordinates: coordinates,
    stops: transformedStops
  };
};

// Function to get all routes (database only - no fallback)
export const getAllRoutes = async (supabaseHelpers) => {
  try {
    // Fetch from database
    const dbRoutes = await supabaseHelpers.getRoutesWithDetails();
    
    if (dbRoutes && dbRoutes.length > 0) {
      console.log('✅ Using database routes:', dbRoutes.length);
      return dbRoutes.map(transformDatabaseRoute);
    }
    
    console.log('📋 No routes found in database');
    return [];
  } catch (error) {
    console.error('❌ Failed to fetch routes from database:', error);
    return [];
  }
};

// Function to get route by ID (database only - no fallback)
export const getRouteById = async (routeId, supabaseHelpers) => {
  try {
    // Fetch from database
    const dbRoute = await supabaseHelpers.getRouteById(routeId);
    
    if (dbRoute) {
      console.log('✅ Using database route:', dbRoute.name);
      return transformDatabaseRoute(dbRoute);
    }
    
    console.log('📋 Route not found:', routeId);
    return null;
  } catch (error) {
    console.error('❌ Failed to fetch route from database:', error);
    return null;
  }
};

// Legacy exports for backward compatibility
export const ROUTES = FALLBACK_ROUTES;
