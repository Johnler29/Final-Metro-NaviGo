import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseHelpers, testDatabaseConnection } from '../lib/supabase';

const SupabaseContext = createContext();

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider = ({ children }) => {
  // Safe mode to avoid crashes during diagnostics/Test Harness
  const SAFE_MODE = false;
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [driverBusAssignments, setDriverBusAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('testing');

  // Load initial data
  useEffect(() => {
    let cleanup;
    if (SAFE_MODE) {
      // Minimal noop load to ensure provider mounts without side effects
      setLoading(false);
      setConnectionStatus('connected');
    } else {
      // Load data and setup real-time subscriptions in both dev and production
      if (__DEV__) {
        // In development, load minimal data
        loadMinimalData();
      } else {
        testConnectionAndLoadData();
      }
      // Always setup real-time subscriptions regardless of environment
      try {
        cleanup = setupRealtimeSubscriptions();
      } catch (e) {
        console.error('Realtime subscription setup failed:', e);
      }
    }
    return () => {
      if (typeof cleanup === 'function') {
        try { cleanup(); } catch {}
      }
    };
  }, []);

  // Minimal data loading for development
  const loadMinimalData = async () => {
    try {
      setLoading(true);
      // Load essential data including drivers for development
      const { data: busesData } = await supabase.from('buses').select('*').limit(5);
      const { data: routesData } = await supabase.from('routes').select('*').limit(5);
      const { data: driversData } = await supabase.from('drivers').select('*').limit(10);
      // CRITICAL: Use the helper function to get assignments with joined bus/driver data
      // This ensures the app can display bus names properly
      const assignmentsData = await supabaseHelpers.getDriverBusAssignments();
      
      setBuses(busesData || []);
      setRoutes(routesData || []);
      setDrivers(driversData || []);
      setDriverBusAssignments(assignmentsData || []);
      setConnectionStatus('connected');
      
      console.log('📊 Loaded minimal data:', {
        buses: busesData?.length || 0,
        routes: routesData?.length || 0,
        drivers: driversData?.length || 0,
        assignments: assignmentsData?.length || 0
      });
    } catch (error) {
      console.error('Error loading minimal data:', error);
      setError(error.message);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testConnectionAndLoadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('testing');

      // First, test the database connection
      console.log('🔍 Testing database connection...');
      const connectionTest = await testDatabaseConnection();
      
      if (!connectionTest.success) {
        console.error('❌ Database connection failed:', connectionTest.error);
        setError(`Database connection failed: ${connectionTest.error}`);
        setConnectionStatus('failed');
        setLoading(false);
        return;
      }

      setConnectionStatus('connected');
      console.log('✅ Database connection successful, loading data...');

      // Load all data in parallel
      const [busesData, routesData, stopsData, schedulesData, driversData, feedbackData, assignmentsData] = await Promise.all([
        supabaseHelpers.getBuses(),
        supabaseHelpers.getRoutes(),
        supabaseHelpers.getStops(),
        supabaseHelpers.getSchedules(),
        supabaseHelpers.getDrivers(),
        supabaseHelpers.getFeedback(),
        supabaseHelpers.getDriverBusAssignments()
      ]);

      console.log('🚌 Buses data loaded:', busesData?.length || 0, 'buses');
      console.log('🚌 Sample bus data:', busesData?.[0]);
      console.log('🚌 Routes data loaded:', routesData?.length || 0, 'routes');
      console.log('🚌 Sample route data:', routesData?.[0]);
      
      setBuses(busesData || []);
      setRoutes(routesData || []);
      setStops(stopsData || []);
      setSchedules(schedulesData || []);
      setDrivers(driversData || []);
      setFeedback(feedbackData || []);
      setDriverBusAssignments(assignmentsData || []);
      
      console.log('✅ All data loaded successfully');
    } catch (err) {
      console.error('❌ Error loading initial data:', err);
      setError(err.message);
      setConnectionStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('🔄 Setting up real-time subscriptions...');
    
    // Subscribe to bus location updates
    const busLocationSubscription = supabaseHelpers.subscribeToBusLocations((payload) => {
      console.log('🎯 Real-time bus update received:', payload);
      
      if (payload.event === 'UPDATE' || payload.event === 'INSERT') {
        console.log('✅ Processing bus update:', payload.new);
        const updatedBus = payload.new;
        
        // Validate bus data - check if driver went off duty
        const hasValidCoordinates = updatedBus.latitude != null && 
                                     updatedBus.longitude != null &&
                                     !isNaN(updatedBus.latitude) && 
                                     !isNaN(updatedBus.longitude);
        const hasActiveDriver = updatedBus.driver_id && 
                                updatedBus.status === 'active';
        
        // Check if bus has recent location update (within last 10 minutes)
        const hasRecentLocation = updatedBus.last_location_update && 
          new Date(updatedBus.last_location_update) > new Date(Date.now() - 10 * 60 * 1000);
        
        // Check if driver just went on duty (bus was recently updated - within last 2 minutes)
        // This allows buses to appear immediately when driver goes on duty, even without coordinates yet
        const justWentOnDuty = updatedBus.updated_at && 
          new Date(updatedBus.updated_at) > new Date(Date.now() - 2 * 60 * 1000);
        
        // CRITICAL: Remove bus immediately if driver went off duty
        // This must happen BEFORE any merge logic to ensure the bus disappears immediately
        if (!hasActiveDriver) {
          console.log('🚫 Removing bus - no active driver (driver went off duty):', updatedBus.id, {
            driver_id: updatedBus.driver_id,
            status: updatedBus.status
          });
          setBuses(prevBuses => {
            const filtered = prevBuses.filter(b => b.id !== updatedBus.id);
            if (filtered.length !== prevBuses.length) {
              console.log('✅ Bus removed successfully from context. Remaining buses:', filtered.length);
            }
            return filtered;
          });
          return;
        }
        
        // If bus has coordinates but they're stale (no update in >10 min), remove it
        // But if bus has no coordinates yet (GPS not started), keep it (will use placeholder)
        if (hasValidCoordinates && !hasRecentLocation && !justWentOnDuty) {
          console.log('🚫 Removing bus - stale location (has coords but >10 min old):', updatedBus.id);
          setBuses(prevBuses => prevBuses.filter(b => b.id !== updatedBus.id));
          return;
        }
        
        // Allow bus to stay even without coordinates if it has active driver
        // This handles cases where GPS hasn't started yet or is having issues
        if (!hasValidCoordinates) {
          if (justWentOnDuty) {
            console.log('✅ Keeping bus (just went on duty, waiting for GPS):', updatedBus.id);
          } else {
            console.log('✅ Keeping bus (active driver, waiting for GPS coordinates):', updatedBus.id);
          }
        }
        
        // Merge all relevant fields so visibility filters react correctly
        // IMPORTANT: Only merge if bus has active driver (already checked above)
        setBuses(prevBuses => {
          const exists = prevBuses.some(b => b.id === updatedBus.id);
          const merged = prevBuses.map(bus => {
            if (bus.id !== updatedBus.id) return bus;
            
            // CRITICAL: Double-check active driver status after merge
            // This ensures we don't accidentally keep a bus that became inactive
            const mergedHasActiveDriver = updatedBus.driver_id && updatedBus.status === 'active';
            if (!mergedHasActiveDriver) {
              // Bus became inactive during merge - don't include it
              return null;
            }
            
            // Only update coordinates if the new update has valid coordinates
            // This prevents overwriting valid coordinates with null/undefined when
            // status or other non-location fields are updated
            const shouldUpdateCoordinates = hasValidCoordinates;
            const preservedLatitude = shouldUpdateCoordinates ? updatedBus.latitude : bus.latitude;
            const preservedLongitude = shouldUpdateCoordinates ? updatedBus.longitude : bus.longitude;
            
            return {
              ...bus,
              // location & telemetry - only update if new coordinates are valid
              latitude: preservedLatitude,
              longitude: preservedLongitude,
              // Only update speed/heading if they're provided (they can be null)
              speed: updatedBus.speed != null ? updatedBus.speed : bus.speed,
              heading: updatedBus.heading != null ? updatedBus.heading : bus.heading,
              tracking_status: updatedBus.tracking_status || bus.tracking_status,
              last_location_update: updatedBus.last_location_update || bus.last_location_update || updatedBus.updated_at,
              // visibility-critical fields - always update these
              status: updatedBus.status,
              driver_id: updatedBus.driver_id,
              route_id: updatedBus.route_id,
              updated_at: updatedBus.updated_at,
            };
          }).filter(bus => bus !== null); // Remove any buses that became null (inactive)
          
          // If bus doesn't exist and has valid data, add it
          // Allow buses that just went on duty even without coordinates yet (will get coordinates soon)
          if (!exists && hasActiveDriver && (hasValidCoordinates || justWentOnDuty)) {
            console.log('✅ Adding new bus to context (just went on duty or has coordinates):', updatedBus.id);
            // If bus just went on duty but has no coordinates, set placeholder coordinates
            // Real coordinates will arrive via location update
            const busToAdd = { ...updatedBus };
            if (!hasValidCoordinates && justWentOnDuty) {
              // Use a default placeholder location (coordinates will update when GPS arrives)
              busToAdd.latitude = 14.4791; // Default placeholder
              busToAdd.longitude = 120.8969;
              console.log('📍 Setting placeholder coordinates for bus that just went on duty:', updatedBus.id);
            }
            return [...merged, busToAdd];
          }
          
          // CRITICAL: Final filter to ensure no inactive buses remain
          // Filter out any buses without active drivers OR invalid coordinates
          // BUT allow buses that just went on duty even without coordinates yet
          return merged.filter(bus => {
            if (!bus) return false;
            
            const busJustWentOnDuty = bus.updated_at && 
              new Date(bus.updated_at) > new Date(Date.now() - 2 * 60 * 1000);
            const hasValidCoords = bus.latitude != null && 
              bus.longitude != null && 
              !isNaN(bus.latitude) && 
              !isNaN(bus.longitude);
            const busHasActiveDriver = bus.driver_id && bus.status === 'active';
            
            // Remove bus if it doesn't have an active driver
            if (!busHasActiveDriver) {
              console.log('🚫 Filter removing inactive bus:', bus.id);
              return false;
            }
            
            // Keep bus if: has active driver AND (has valid coordinates OR just went on duty)
            return busHasActiveDriver && (hasValidCoords || busJustWentOnDuty);
          });
        });
      } else if (payload.event === 'DELETE') {
        // Remove deleted buses from local state
        const deletedId = payload.old?.id;
        if (deletedId) {
          setBuses(prev => prev.filter(b => b.id !== deletedId));
        }
      }
    });

    // Subscribe to schedule updates
    const scheduleSubscription = supabaseHelpers.subscribeToSchedules((payload) => {
      if (payload.event === 'UPDATE' || payload.event === 'INSERT') {
        setSchedules(prevSchedules => {
          const updatedSchedules = prevSchedules.map(schedule => {
            if (schedule.id === payload.new.id) {
              return payload.new;
            }
            return schedule;
          });
          return updatedSchedules;
        });
      }
    });

    // Log subscription status
    if (busLocationSubscription) {
      console.log('✅ Bus location subscription created');
    } else {
      console.error('❌ Failed to create bus location subscription');
    }
    
    if (scheduleSubscription) {
      console.log('✅ Schedule subscription created');
    } else {
      console.error('❌ Failed to create schedule subscription');
    }

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔄 Cleaning up real-time subscriptions...');
      busLocationSubscription?.unsubscribe();
      scheduleSubscription?.unsubscribe();
    };
  };

  // Poll bus data in development for fallback real-time updates
  // IMPORTANT: Do NOT overwrite newer real-time coordinates with older polled data.
  // The passenger map (RealtimeBusMap) relies on Supabase real-time as the source
  // of truth for GPS. This dev-only poll should only:
  //   - bootstrap initial data, and
  //   - refresh non-location fields (status, driver, etc.)
  // while preserving any more recent latitude/longitude already in state.
  useEffect(() => {
    if (SAFE_MODE) return; // disable polling in safe mode
    if (!__DEV__) return; // Only run in development

    const pollInterval = setInterval(async () => {
      try {
        const busesData = await supabaseHelpers.getBuses();

        setBuses((prevBuses) => {
          const incoming = busesData || [];

          // First load or no previous data: just take what we got (already filtered by getBuses).
          if (!prevBuses || prevBuses.length === 0) {
            return incoming;
          }

          const prevMap = new Map(prevBuses.map((b) => [b.id, b]));
          const incomingIds = new Set(incoming.map((b) => b.id));

          const merged = incoming.map((bus) => {
            const existing = prevMap.get(bus.id);
            if (!existing) {
              // New bus – use server values as-is
              return bus;
            }

            const hasExistingCoords =
              typeof existing.latitude === 'number' &&
              Number.isFinite(existing.latitude) &&
              typeof existing.longitude === 'number' &&
              Number.isFinite(existing.longitude);

            const hasIncomingCoords =
              typeof bus.latitude === 'number' &&
              Number.isFinite(bus.latitude) &&
              typeof bus.longitude === 'number' &&
              Number.isFinite(bus.longitude);

            // Start from the latest non-location fields from the server,
            // but preserve more reliable coordinates already in memory.
            const mergedBus = {
              ...existing,
              ...bus,
            };

            // If we already have valid coordinates and the polled data either
            // has no coordinates or clearly invalid ones, keep the in-memory
            // position instead of snapping the marker back.
            if (hasExistingCoords && !hasIncomingCoords) {
              mergedBus.latitude = existing.latitude;
              mergedBus.longitude = existing.longitude;
            }

            return mergedBus;
          });

          // CRITICAL: Remove buses from prevBuses that are no longer in incoming (driver went off duty)
          // Also filter out any buses in merged that no longer have active drivers
          const filtered = merged.filter(bus => {
            const hasActiveDriver = bus.driver_id && bus.status === 'active';
            return hasActiveDriver;
          });

          // Remove buses from prevBuses that are no longer in incoming
          prevBuses.forEach(bus => {
            if (!incomingIds.has(bus.id)) {
              // Bus was removed from server (driver went off duty)
              console.log('🚫 Removing bus from context (no longer in polled data):', bus.id);
            }
          });

          return filtered;
        });
      } catch (err) {
        console.warn('⚠️ Error polling buses:', err.message);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, []);

  // Bus operations
  const getBusById = async (id) => {
    try {
      return await supabaseHelpers.getBusById(id);
    } catch (err) {
      console.error('Error getting bus by ID:', err);
      throw err;
    }
  };


  // Route operations
  const getRouteById = async (id) => {
    try {
      return await supabaseHelpers.getRouteById(id);
    } catch (err) {
      console.error('Error getting route by ID:', err);
      throw err;
    }
  };

  const getStopsByRoute = async (routeId) => {
    try {
      return await supabaseHelpers.getStopsByRoute(routeId);
    } catch (err) {
      console.error('Error getting stops by route:', err);
      throw err;
    }
  };

  // Schedule operations
  const getSchedulesByRoute = async (routeId) => {
    try {
      return await supabaseHelpers.getSchedulesByRoute(routeId);
    } catch (err) {
      console.error('Error getting schedules by route:', err);
      throw err;
    }
  };

  // Feedback operations
  const submitFeedback = async (feedback) => {
    try {
      return await supabaseHelpers.submitFeedback(feedback);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw err;
    }
  };

  // User operations
  const createUser = async (userData) => {
    try {
      return await supabaseHelpers.createUser(userData);
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  };

  const getUserById = async (id) => {
    try {
      return await supabaseHelpers.getUserById(id);
    } catch (err) {
      console.error('Error getting user by ID:', err);
      throw err;
    }
  };

  // Driver operations
  const getDriverById = async (id) => {
    try {
      return await supabaseHelpers.getDriverById(id);
    } catch (err) {
      console.error('Error getting driver by ID:', err);
      throw err;
    }
  };

  const getDriverSchedules = async (driverId) => {
    try {
      return await supabaseHelpers.getDriverSchedules(driverId);
    } catch (err) {
      console.error('Error getting driver schedules:', err);
      throw err;
    }
  };

  const getDriverBuses = async (driverId) => {
    try {
      return await supabaseHelpers.getDriverBuses(driverId);
    } catch (err) {
      console.error('Error getting driver buses:', err);
      throw err;
    }
  };

  const updateDriverStatus = async (driverId, status) => {
    try {
      return await supabaseHelpers.updateDriverStatus(driverId, status);
    } catch (err) {
      console.error('Error updating driver status:', err);
      throw err;
    }
  };

  const startTrip = async (driverId, busId, routeId) => {
    try {
      return await supabaseHelpers.startTrip(driverId, busId, routeId);
    } catch (err) {
      console.error('Error starting trip:', err);
      throw err;
    }
  };

  const endTrip = async (tripId, endData) => {
    try {
      return await supabaseHelpers.endTrip(tripId, endData);
    } catch (err) {
      console.error('Error ending trip:', err);
      throw err;
    }
  };

  const updatePassengerCount = async (busId, passengerCount) => {
    try {
      return await supabaseHelpers.updatePassengerCount(busId, passengerCount);
    } catch (err) {
      console.error('Error updating passenger count:', err);
      throw err;
    }
  };

  const reportEmergency = async (driverId, emergencyData) => {
    try {
      return await supabaseHelpers.reportEmergency(driverId, emergencyData);
    } catch (err) {
      console.error('Error reporting emergency:', err);
      throw err;
    }
  };

  const reportMaintenanceIssue = async (driverId, issueData) => {
    try {
      return await supabaseHelpers.reportMaintenanceIssue(driverId, issueData);
    } catch (err) {
      console.error('Error reporting maintenance issue:', err);
      throw err;
    }
  };

  const getDriverPerformance = async (driverId, period = 'week') => {
    try {
      return await supabaseHelpers.getDriverPerformance(driverId, period);
    } catch (err) {
      console.error('Error getting driver performance:', err);
      throw err;
    }
  };

  const submitPassengerFeedback = async (userId, feedbackData) => {
    try {
      return await supabaseHelpers.submitPassengerFeedback(userId, feedbackData);
    } catch (err) {
      console.error('Error submitting passenger feedback:', err);
      throw err;
    }
  };

  const getPassengerFeedback = async (userId, filters = {}) => {
    try {
      return await supabaseHelpers.getPassengerFeedback(userId, filters);
    } catch (err) {
      console.error('Error getting passenger feedback:', err);
      throw err;
    }
  };

  const updateBusCapacityStatus = async (busId, capacityPercentage) => {
    try {
      return await supabaseHelpers.updateBusCapacityStatus(busId, capacityPercentage);
    } catch (err) {
      console.error('Error updating bus capacity status:', err);
      throw err;
    }
  };

  const getBusCapacityStatus = async (busId) => {
    try {
      return await supabaseHelpers.getBusCapacityStatus(busId);
    } catch (err) {
      console.error('Error getting bus capacity status:', err);
      throw err;
    }
  };

  const authenticateDriver = async (email, password) => {
    try {
      return await supabaseHelpers.authenticateDriver(email, password);
    } catch (err) {
      console.error('Error authenticating driver:', err);
      throw err;
    }
  };

  const updateBusLocation = async (locationData) => {
    try {
      return await supabaseHelpers.updateBusLocation(locationData);
    } catch (err) {
      console.error('Error updating bus location:', err);
      throw err;
    }
  };

  const startDriverSession = async (driverId, busId) => {
    try {
      return await supabaseHelpers.startDriverSession(driverId, busId);
    } catch (err) {
      console.error('Error starting driver session:', err);
      throw err;
    }
  };

  const endDriverSession = async (sessionId) => {
    try {
      return await supabaseHelpers.endDriverSession(sessionId);
    } catch (err) {
      console.error('Error ending driver session:', err);
      throw err;
    }
  };

  const refreshData = async () => {
    try {
      await testConnectionAndLoadData();
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  };

  const refreshDriverData = async () => {
    try {
      console.log('🔄 Refreshing driver data...');
      const { data: driversData } = await supabase.from('drivers').select('*').limit(10);
      // CRITICAL: Use the helper function to get assignments with joined bus/driver data
      const assignmentsData = await supabaseHelpers.getDriverBusAssignments();
      
      setDrivers(driversData || []);
      setDriverBusAssignments(assignmentsData || []);
      
      console.log('✅ Driver data refreshed:', {
        drivers: driversData?.length || 0,
        assignments: assignmentsData?.length || 0
      });
    } catch (error) {
      console.error('❌ Error refreshing driver data:', error);
      throw error;
    }
  };

  // Ping Bus Notifications
  const pingBus = async (busId, pingType = 'ride_request', message = '', location = null) => {
    try {
      return await supabaseHelpers.pingBus(busId, pingType, message, location);
    } catch (err) {
      console.error('Error pinging bus:', err);
      throw err;
    }
  };

  const getUserPingStatus = async () => {
    try {
      return await supabaseHelpers.getUserPingStatus();
    } catch (err) {
      console.error('Error getting user ping status:', err);
      throw err;
    }
  };

  const getUserPingNotifications = async () => {
    try {
      return await supabaseHelpers.getUserPingNotifications();
    } catch (err) {
      console.error('Error getting user ping notifications:', err);
      throw err;
    }
  };

  const getBusPingNotifications = async (busId) => {
    try {
      return await supabaseHelpers.getBusPingNotifications(busId);
    } catch (err) {
      console.error('Error getting bus ping notifications:', err);
      throw err;
    }
  };

  const acknowledgePing = async (pingId) => {
    try {
      return await supabaseHelpers.acknowledgePing(pingId);
    } catch (err) {
      console.error('Error acknowledging ping:', err);
      throw err;
    }
  };

  const completePing = async (pingId) => {
    try {
      return await supabaseHelpers.completePing(pingId);
    } catch (err) {
      console.error('Error completing ping:', err);
      throw err;
    }
  };

  const value = {
    // Supabase client
    supabase,
    
    // State
    buses,
    routes,
    stops,
    schedules,
    drivers,
    feedback,
    driverBusAssignments,
    loading,
    error,
    connectionStatus,
    
    // Operations
    getBusById,
    getRouteById,
    getStopsByRoute,
    getSchedulesByRoute,
    submitFeedback,
    createUser,
    getUserById,
    getDriverById,
    getDriverSchedules,
    getDriverBuses,
    updateDriverStatus,
    startTrip,
    endTrip,
    updatePassengerCount,
    reportEmergency,
    reportMaintenanceIssue,
    getDriverPerformance,
    submitPassengerFeedback,
    getPassengerFeedback,
    updateBusCapacityStatus,
    getBusCapacityStatus,
    authenticateDriver,
    updateBusLocation,
    startDriverSession,
    endDriverSession,
    refreshData,
    refreshDriverData,
    // Ping functions
    pingBus,
    getUserPingStatus,
    getUserPingNotifications,
    getBusPingNotifications,
    acknowledgePing,
    completePing
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}; 