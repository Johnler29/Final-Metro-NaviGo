/**
 * Route Directions Utility
 * Fetches accurate road paths using Google Maps Directions API
 */

/**
 * Fetch route directions from Google Maps
 * @param {Array} stops - Array of stops with latitude/longitude
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Array>} - Array of coordinates following actual roads
 */
export const getRouteDirections = async (stops, apiKey) => {
  if (!stops || stops.length < 2) {
    console.warn('Need at least 2 stops to generate directions');
    return [];
  }

  if (!apiKey) {
    console.warn('Google Maps API key not provided');
    return generateSimplePath(stops);
  }

  try {
    // Prepare waypoints (all stops except first and last)
    const origin = `${stops[0].latitude},${stops[0].longitude}`;
    const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
    
    const waypoints = stops.slice(1, -1)
      .map(stop => `${stop.latitude},${stop.longitude}`)
      .join('|');

    // Build API URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = new URLSearchParams({
      origin,
      destination,
      key: apiKey,
      mode: 'driving',
      alternatives: 'false'
    });

    if (waypoints) {
      params.append('waypoints', waypoints);
    }

    // Fetch directions
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', data.status, data.error_message);
      return generateSimplePath(stops);
    }

    // Decode polyline from response
    const route = data.routes[0];
    if (!route || !route.overview_polyline) {
      console.warn('No route polyline found');
      return generateSimplePath(stops);
    }

    // Decode the polyline
    const coordinates = decodePolyline(route.overview_polyline.points);
    
    console.log(`✅ Fetched ${coordinates.length} coordinate points for route`);
    return coordinates;

  } catch (error) {
    console.error('Error fetching route directions:', error);
    return generateSimplePath(stops);
  }
};

/**
 * Decode Google Maps polyline format to coordinates
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} - Array of {latitude, longitude} objects
 */
const decodePolyline = (encoded) => {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    // Decode latitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return coordinates;
};

/**
 * Generate simple interpolated path between stops (fallback)
 * @param {Array} stops - Array of stops with latitude/longitude
 * @returns {Array} - Array of interpolated coordinates
 */
const generateSimplePath = (stops) => {
  if (stops.length < 2) return [];

  const coordinates = [];
  
  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i];
    const end = stops[i + 1];
    
    // Add start point
    coordinates.push({ 
      latitude: start.latitude, 
      longitude: start.longitude 
    });
    
    // Add 3 interpolated points between stops
    for (let j = 1; j <= 3; j++) {
      const ratio = j / 4;
      coordinates.push({
        latitude: start.latitude + (end.latitude - start.latitude) * ratio,
        longitude: start.longitude + (end.longitude - start.longitude) * ratio
      });
    }
  }
  
  // Add final stop
  const lastStop = stops[stops.length - 1];
  coordinates.push({ 
    latitude: lastStop.latitude, 
    longitude: lastStop.longitude 
  });
  
  return coordinates;
};

/**
 * Fetch and save route coordinates to database
 * @param {string} routeId - Route ID
 * @param {Array} stops - Array of stops
 * @param {object} supabase - Supabase client
 * @param {string} apiKey - Google Maps API key (optional)
 */
export const updateRouteCoordinates = async (routeId, stops, supabase, apiKey = null) => {
  try {
    // Sort stops by sequence
    const sortedStops = stops.sort((a, b) => 
      (a.stop_order || a.sequence || 0) - (b.stop_order || b.sequence || 0)
    );

    // Get route coordinates
    const coordinates = await getRouteDirections(sortedStops, apiKey);

    if (coordinates.length === 0) {
      console.warn('No coordinates generated for route');
      return false;
    }

    // Save to database
    const { error } = await supabase
      .from('routes')
      .update({ 
        route_coordinates: coordinates,
        updated_at: new Date().toISOString()
      })
      .eq('id', routeId);

    if (error) {
      console.error('Error saving route coordinates:', error);
      return false;
    }

    console.log(`✅ Saved ${coordinates.length} coordinates for route ${routeId}`);
    return true;

  } catch (error) {
    console.error('Error updating route coordinates:', error);
    return false;
  }
};

