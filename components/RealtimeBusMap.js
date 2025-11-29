import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import { useSupabase } from '../contexts/SupabaseContext';
import { validateLocation, calculateDistance } from '../utils/locationUtils';
import FallbackBusList from './FallbackBusList';
import { getAllRoutes, getRouteById } from '../data/routes';
import { supabaseHelpers } from '../lib/supabase';
import RoutePolyline from './RoutePolyline';

const { width, height } = Dimensions.get('window');

const RealtimeBusMap = ({ 
  initialRegion, 
  onBusSelect, 
  selectedBusId,
  showArrivalTimes = true,
  showCapacityStatus = true,
  userLocation = null,
  onBusesLoaded = null,
  selectedRouteId = null,
  onRouteSelect = null
}) => {
  const { supabase, buses: contextBuses, routes } = useSupabase();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [locationValidation, setLocationValidation] = useState({});
  const [arrivalTimes, setArrivalTimes] = useState({});
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showFallback, setShowFallback] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(true);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Performance: Throttle real-time updates to prevent freezing
  const lastUpdateTime = useRef({});
  const pendingUpdates = useRef(new Map());
  const updateTimer = useRef(null);
  
  // Throttle bus updates - only update UI every 5 seconds per bus (prevents lag/freezing)
  const THROTTLE_MS = 5000; // Update UI at most every 5 seconds per bus
  const mapRef = useRef(null);
  const userLocationRef = useRef(userLocation);
  const selectedBusRef = useRef(null);
  const isUserInteractingRef = useRef(false);
  const lastUserInteractionTime = useRef(0);

  const getGoogleMapsApiKey = () => {
    return (
      Constants?.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ||
      Constants?.manifest?.extra?.GOOGLE_MAPS_API_KEY ||
      undefined
    );
  };


  // Start pulse animation for live buses
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Fade in animation for new buses
  const fadeInBus = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Load available routes
  const loadRoutes = useCallback(async () => {
    try {
      const routes = await getAllRoutes(supabaseHelpers);
      setAvailableRoutes(routes);
      
      // Set selected route if provided
      if (selectedRouteId) {
        const route = await getRouteById(selectedRouteId, supabaseHelpers);
        if (route) {
          setSelectedRoute(route);
          console.log('✅ Selected route:', route.name);
        }
      }
    } catch (err) {
      console.error('Error loading routes:', err);
    }
  }, [selectedRouteId]);

  // Load initial bus data - use the same approach as manual tracking
  const loadBuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!contextBuses || contextBuses.length === 0) {
        setBuses([]);
        setLoading(false); // IMPORTANT: Always set loading to false
        return;
      }

      // We need the merged list both for state and for ETA calculations
      let nextBuses = [];

      setBuses(prevBuses => {
        const prevMap = new Map(prevBuses.map(b => [b.bus_id, b]));

        nextBuses = contextBuses
          .map(bus => {
            const route = routes?.find(r => r.id === bus.route_id);

            const hasActiveDriver = bus.driver_id && bus.status === 'active';
            const hasValidCoordinates =
              typeof bus.latitude === 'number' &&
              typeof bus.longitude === 'number' &&
              !isNaN(bus.latitude) &&
              !isNaN(bus.longitude);

            if (!hasActiveDriver) {
              return null;
            }

            // Start with database coordinates
            let lat = hasValidCoordinates ? bus.latitude : null;
            let lng = hasValidCoordinates ? bus.longitude : null;

            // If new data has no coordinates, keep the last known ones (avoid snapping back)
            if (!hasValidCoordinates) {
              const prev = prevMap.get(bus.id);
              if (prev && typeof prev.latitude === 'number' && typeof prev.longitude === 'number') {
                lat = prev.latitude;
                lng = prev.longitude;
              } else {
                // No previous coordinates to fall back to – don't show this bus yet
                return null;
              }
            }

            const transformedBus = {
              bus_id: bus.id,
              bus_name: bus.name || bus.bus_number,
              tracking_status: bus.tracking_status || 'moving',
              latitude: lat,
              longitude: lng,
              route_name: route?.name || route?.route_number || 'Unknown Route',
              current_passengers: bus.current_passengers || 0,
              capacity_percentage: bus.capacity_percentage || 0,
              max_capacity: bus.max_capacity || 50,
              location_status: 'live',
              capacity_status:
                (bus.capacity_percentage || 0) >= 90
                  ? 'full'
                  : (bus.capacity_percentage || 0) >= 70
                  ? 'crowded'
                  : (bus.capacity_percentage || 0) >= 40
                  ? 'moderate'
                  : 'light',
              is_moving: (bus.tracking_status || 'moving') === 'moving',
              last_location_update: bus.updated_at || new Date().toISOString(),
              validation: { isValid: true, reason: 'context_data' },
            };

            return transformedBus;
          })
          .filter(bus => {
            if (!bus) return false;
            const isValid =
              typeof bus.latitude === 'number' &&
              typeof bus.longitude === 'number' &&
              !isNaN(bus.latitude) &&
              !isNaN(bus.longitude);
            return isValid;
          });

        return nextBuses;
      });

      setLastUpdate(new Date());

      // IMPORTANT: Clear loading state FIRST, then do async operations
      // This ensures map appears immediately
      setLoading(false);

      // Calculate arrival times AFTER loading is cleared (non-blocking)
      // Use the most recent passenger location (if available) for ETA calculations
      if (showArrivalTimes && (userLocationRef.current || initialRegion) && nextBuses.length > 0) {
        calculateArrivalTimesForBuses(nextBuses).catch(err => {
          console.warn('Error calculating arrival times (non-blocking):', err);
        });
      }

      fadeInBus();
    } catch (err) {
      console.error('Error loading buses:', err);
      setError('Failed to load bus locations');
      setLoading(false); // Always clear loading on error
    }
  }, [contextBuses, routes, showArrivalTimes]);

  // Refresh buses function for real-time updates
  const refreshBuses = useCallback(async () => {
    await loadBuses();
  }, [loadBuses]);

  // Validate bus location
  const validateBusLocation = async (bus) => {
    try {
      if (!supabase) {
        return { isValid: false, reason: 'supabase_unavailable' };
      }

      const { data, error } = await supabase.rpc('validate_bus_location', {
        p_bus_id: bus.bus_id,
        p_latitude: bus.latitude,
        p_longitude: bus.longitude,
        p_accuracy: bus.accuracy
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Location validation error:', err);
      return { isValid: false, reason: 'validation_error' };
    }
  };

  // Calculate arrival times for all buses
  const calculateArrivalTimesForBuses = async (busList) => {
    if (!supabase) return;
    
    const passengerLocation = userLocationRef.current || initialRegion;
    if (!passengerLocation) return;
    
    try {
      const arrivalPromises = busList.map(async (bus) => {
        const { data, error } = await supabase.rpc('calculate_arrival_times', {
          p_bus_id: bus.bus_id,
          p_passenger_lat: passengerLocation.latitude,
          p_passenger_lng: passengerLocation.longitude
        });
        
        if (error) throw error;
        return { busId: bus.bus_id, arrivalData: data };
      });
      
      const results = await Promise.all(arrivalPromises);
      const arrivalMap = {};
      
      results.forEach(({ busId, arrivalData }) => {
        if (arrivalData && !arrivalData.error) {
          arrivalMap[busId] = arrivalData;
        }
      });
      
      setArrivalTimes(arrivalMap);
    } catch (err) {
      console.error('Error calculating arrival times:', err);
    }
  };

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    // Check if supabase is available
    if (!supabase) {
      console.warn('Supabase client not available for real-time subscription');
      return null;
    }

    // Check if supabase has real-time capabilities
    if (!supabase.channel) {
      console.error('Supabase real-time not available - channel method missing');
      return null;
    }

    try {
      // Create a more robust subscription with better error handling
      const subscription = supabase
        .channel('bus_location_updates', {
          config: {
            broadcast: { self: false },
            presence: { key: 'bus-location-updates' }
          }
        })
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'buses'
            // Single subscription for all bus updates (throttled to prevent freezing)
          },
          (payload) => {
            // Only handle if it's a location update (latitude/longitude changed)
            if (payload.new.latitude != null && payload.new.longitude != null) {
              handleBusUpdateThrottled(payload);
            }
          }
        )
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buses'
          },
          (payload) => {
            handleBusInsert(payload);
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'buses',
            filter: 'tracking_status=eq.offline'
          },
          (payload) => {
            // Remove offline buses from the map
            setBuses(prevBuses => 
              prevBuses.filter(bus => bus.bus_id !== payload.new.id)
            );
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // subscription is active
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription failed - check if real-time is enabled for buses table');
            console.error('💡 Run the SQL script: sql/enable-realtime-bus-tracking.sql');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Real-time subscription timed out');
          } else if (status === 'CLOSED') {
            console.error('❌ Real-time subscription closed');
          }
        });

      return subscription;
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      console.error('Error details:', error.message, error.stack);
      console.error('💡 Make sure real-time is enabled for the buses table in Supabase');
      return null;
    }
  }, [supabase, refreshBuses, handleBusUpdateThrottled, handleBusInsert]);

  // Process bus update (defined first for throttling)
  const processBusUpdate = useCallback((payload) => {
    try {
      const updatedBus = payload.new;
      const busId = updatedBus.id;
      
      // Check if driver went off duty - validate coordinates and driver status
      const hasValidCoordinates = updatedBus.latitude != null && 
                                   updatedBus.longitude != null &&
                                   !isNaN(updatedBus.latitude) && 
                                   !isNaN(updatedBus.longitude);
      const hasActiveDriver = updatedBus.driver_id && 
                              updatedBus.status === 'active';
      
      // If driver went off duty, remove bus from map (immediate, no throttling)
      if (!hasActiveDriver) {
        setBuses(prevBuses => prevBuses.filter(bus => bus.bus_id !== busId));
        return;
      }

      // If we don't have valid coordinates in this update, keep the previous
      // position instead of snapping the marker back to a placeholder.
      if (!hasValidCoordinates) {
        return;
      }
      
      // Update bus in state (batched/throttled) - only update if coordinates actually changed
      setBuses(prevBuses => {
        const existingBus = prevBuses.find(bus => bus.bus_id === busId);
        
        // Check if coordinates actually changed (avoid unnecessary re-renders)
        const coordsChanged = !existingBus || 
          existingBus.latitude !== updatedBus.latitude || 
          existingBus.longitude !== updatedBus.longitude;
        
        // Performance: Only update if coordinates changed (skip duplicate updates)
        if (existingBus && !coordsChanged) {
          // Coordinates haven't changed - skip update to prevent re-render
          return prevBuses;
        }
        
        const updatedBuses = prevBuses.map(bus => {
          if (bus.bus_id === busId) {
            return {
              ...bus,
              latitude: updatedBus.latitude,
              longitude: updatedBus.longitude,
              tracking_status: updatedBus.tracking_status,
              current_passengers: updatedBus.current_passengers,
              capacity_percentage: updatedBus.capacity_percentage,
              last_location_update: updatedBus.updated_at || updatedBus.last_location_update,
              location_status: 'live'
            };
          }
          return bus;
        });
        
        // If bus not in current list, add it if it has active driver AND valid coordinates
        if (!prevBuses.find(bus => bus.bus_id === busId) && hasActiveDriver && hasValidCoordinates) {
          const route = routes?.find(r => r.id === updatedBus.route_id);

          const newBus = {
            bus_id: busId,
            bus_name: updatedBus.name || updatedBus.bus_number,
            tracking_status: updatedBus.tracking_status || 'moving',
            latitude: updatedBus.latitude,
            longitude: updatedBus.longitude,
            route_name: route?.name || route?.route_number || 'Unknown Route',
            current_passengers: updatedBus.current_passengers || 0,
            capacity_percentage: updatedBus.capacity_percentage || 0,
            max_capacity: updatedBus.max_capacity || 50,
            location_status: 'live',
            capacity_status: (updatedBus.capacity_percentage || 0) >= 90 ? 'full' : 
                            (updatedBus.capacity_percentage || 0) >= 70 ? 'crowded' : 
                            (updatedBus.capacity_percentage || 0) >= 40 ? 'moderate' : 'light',
            is_moving: (updatedBus.tracking_status || 'moving') === 'moving',
            last_location_update: updatedBus.updated_at || updatedBus.last_location_update,
            validation: { isValid: true, reason: 'realtime_update' }
          };
          updatedBuses.push(newBus);
        }
        
        // Filter out any buses with invalid coordinates
        return updatedBuses.filter(bus => {
          const hasValidCoords = bus.latitude != null && 
            bus.longitude != null && 
            !isNaN(bus.latitude) && 
            !isNaN(bus.longitude);
          return hasValidCoords; // Placeholder coordinates are valid numbers, so this should pass
        });
      });
      
    } catch (err) {
      console.error('Error handling bus update:', err);
    }
  }, [routes]);
  
  // Handle bus updates from real-time subscription with throttling
  const handleBusUpdateThrottled = useCallback(async (payload) => {
    try {
      const updatedBus = payload.new;
      const busId = updatedBus.id;
      const now = Date.now();
      
      // PERFORMANCE FIX: Throttle updates to prevent freezing
      // Only process updates every THROTTLE_MS milliseconds per bus
      const lastUpdate = lastUpdateTime.current[busId] || 0;
      const timeSinceLastUpdate = now - lastUpdate;
      
      // Immediate processing for critical updates (driver off duty, etc.)
      const isCriticalUpdate = !updatedBus.driver_id || updatedBus.status !== 'active';
      
      if (!isCriticalUpdate && timeSinceLastUpdate < THROTTLE_MS) {
        // Store pending update for later processing
        pendingUpdates.current.set(busId, payload);
        
        // Schedule batch update if not already scheduled
        if (!updateTimer.current) {
          updateTimer.current = setTimeout(() => {
            // Process all pending updates
            const updatesToProcess = Array.from(pendingUpdates.current.values());
            pendingUpdates.current.clear();
            updateTimer.current = null;
            
            // Process the most recent update for each bus
            updatesToProcess.forEach(p => {
              if (p && p.new) {
                const busId = p.new.id;
                lastUpdateTime.current[busId] = Date.now();
                processBusUpdate(p);
              }
            });
          }, THROTTLE_MS - timeSinceLastUpdate);
        }
        
        return; // Skip this update, will be processed in batch
      }
      
      // Update timestamp and process immediately
      lastUpdateTime.current[busId] = now;
      processBusUpdate(payload);
      
    } catch (err) {
      console.error('Error handling bus update:', err);
    }
  }, [processBusUpdate]);

  // Handle bus inserts from real-time subscription
  const handleBusInsert = useCallback(async (payload) => {
    try {
      const newBus = payload.new;
      const busId = newBus.id;
      
      // Validate bus data before adding
      const hasValidCoordinates = newBus.latitude != null && 
                                   newBus.longitude != null &&
                                   !isNaN(newBus.latitude) && 
                                   !isNaN(newBus.longitude);
      const hasActiveDriver = newBus.driver_id && 
                              newBus.status === 'active';
      
      // Only add bus if it has valid coordinates and active driver
      if (!hasValidCoordinates || !hasActiveDriver) {
        return;
      }
      
      // Add new bus to state
      setBuses(prevBuses => {
        if (prevBuses.find(bus => bus.bus_id === busId)) {
          return prevBuses; // Already exists
        }
        
        const route = routes?.find(r => r.id === newBus.route_id);
        const transformedBus = {
          bus_id: busId,
          bus_name: newBus.name || newBus.bus_number,
          tracking_status: newBus.tracking_status || 'moving',
          latitude: newBus.latitude,
          longitude: newBus.longitude,
          route_name: route?.name || route?.route_number || 'Unknown Route',
          current_passengers: newBus.current_passengers || 0,
          capacity_percentage: newBus.capacity_percentage || 0,
          max_capacity: newBus.max_capacity || 50,
          location_status: 'live',
          capacity_status: (newBus.capacity_percentage || 0) >= 90 ? 'full' : 
                          (newBus.capacity_percentage || 0) >= 70 ? 'crowded' : 
                          (newBus.capacity_percentage || 0) >= 40 ? 'moderate' : 'light',
          is_moving: (newBus.tracking_status || 'moving') === 'moving',
          last_location_update: newBus.updated_at,
          validation: { isValid: true, reason: 'realtime_insert' }
        };
        
        return [...prevBuses, transformedBus];
      });
      
    } catch (err) {
      console.error('Error handling bus insert:', err);
    }
  }, [routes]);

  // Handle capacity updates
  const handleCapacityUpdate = useCallback((payload) => {
    const eventData = payload.new.event_data;
    const busId = eventData.bus_id;
    
    setBuses(prevBuses => 
      prevBuses.map(bus => 
        bus.bus_id === busId 
          ? { 
              ...bus, 
              capacity_percentage: eventData.new_capacity,
              capacity_status: eventData.capacity_status
            }
          : bus
      )
    );
  }, []);

  // Get bus marker color based on status
  const getBusMarkerColor = (bus) => {
    if (bus.location_status === 'offline') return '#9CA3AF';
    if (bus.capacity_status === 'full') return '#EF4444';
    if (bus.capacity_status === 'crowded') return '#F59E0B';
    if (bus.is_moving) return '#10B981';
    return '#3B82F6';
  };

  // Get bus icon based on status
  const getBusIcon = (bus) => {
    if (bus.location_status === 'offline') return '🚫';
    if (bus.capacity_status === 'full') return '🚌';
    if (bus.capacity_status === 'crowded') return '🚌';
    if (bus.is_moving) return '🚌';
    return '🚌';
  };

  // Get bus marker color based on status
  const getBusMarkerColorSafe = useCallback((bus) => {
    if (!bus) return '#3B82F6';
    if (bus.location_status === 'offline') return '#9CA3AF';
    if (bus.capacity_status === 'full') return '#EF4444';
    if (bus.capacity_status === 'crowded') return '#F59E0B';
    if (bus.is_moving) return '#10B981';
    return '#3B82F6';
  }, []);

  // Render bus marker - simplified to prevent crashes
  const renderBusMarker = useCallback((bus) => {
    if (!bus || !bus.bus_id || bus.latitude == null || bus.longitude == null) {
      return null;
    }
    
    try {
      const isSelected = selectedBusId === bus.bus_id;
      const markerColor = getBusMarkerColorSafe(bus);
      
      return (
        <Marker
          key={bus.bus_id}
          coordinate={{
            latitude: Number(bus.latitude),
            longitude: Number(bus.longitude)
          }}
          title={bus.bus_name || 'Bus'}
          description={`${bus.route_name || 'Unknown Route'} • ${bus.capacity_status || 'unknown'}`}
          onPress={() => {
            if (onBusSelect) {
              onBusSelect(bus);
            }
          }}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[
            styles.busMarker,
            {
              backgroundColor: markerColor,
              transform: [{ scale: isSelected ? 1.2 : 1 }]
            }
          ]}>
            <Text style={styles.busIcon}>🚌</Text>
          </View>
        </Marker>
      );
    } catch (error) {
      console.error('Error rendering bus marker:', error);
      return null;
    }
  }, [selectedBusId, onBusSelect, getBusMarkerColorSafe]);

  // Render arrival time info
  const renderArrivalInfo = (bus) => {
    const arrivalData = arrivalTimes[bus.bus_id];
    if (!arrivalData || arrivalData.error) return null;
    
    return (
      <View style={styles.arrivalInfo}>
        <Text style={styles.arrivalTime}>
          {arrivalData.estimated_arrival_minutes} min
        </Text>
        <Text style={styles.arrivalStatus}>
          {arrivalData.status.replace('_', ' ')}
        </Text>
      </View>
    );
  };

  // Update user location ref when it changes
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // Focus on selected bus when selectedBusId changes (only if a bus is selected)
  useEffect(() => {
    if (selectedBusId && buses.length > 0 && mapRef.current) {
      setFollowUserLocation(false); // Stop following user when bus is selected
      const selectedBus = buses.find(bus => bus.bus_id === selectedBusId);
      if (selectedBus) {
        const region = {
          latitude: selectedBus.latitude,
          longitude: selectedBus.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        try {
          mapRef.current.animateToRegion(region, 1000);
        } catch (e) {
          console.warn('animateToRegion failed:', e?.message || e);
        }
      } else {
      }
    } else if (!selectedBusId) {
      // When no bus is selected, follow user location
      setFollowUserLocation(true);
    }
  }, [selectedBusId, buses]);

  // Follow selected bus as it moves (if a bus is selected)
  useEffect(() => {
    if (selectedBusId && buses.length > 0 && mapRef.current && !followUserLocation) {
      const selectedBus = buses.find(bus => bus.bus_id === selectedBusId);
      if (selectedBus && selectedBus.latitude && selectedBus.longitude) {
        // Only animate if coordinates actually changed (avoid unnecessary animations)
        const prevCoords = selectedBusRef.current;
        const coordsChanged = !prevCoords || 
          prevCoords.latitude !== selectedBus.latitude || 
          prevCoords.longitude !== selectedBus.longitude;
        
        if (coordsChanged) {
          selectedBusRef.current = {
            latitude: selectedBus.latitude,
            longitude: selectedBus.longitude
          };
          
          const region = {
            latitude: selectedBus.latitude,
            longitude: selectedBus.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          try {
            mapRef.current.animateToRegion(region, 1000);
          } catch (e) {
            console.warn('Failed to follow selected bus:', e?.message || e);
          }
        }
      }
    } else {
      selectedBusRef.current = null;
    }
  }, [buses, selectedBusId, followUserLocation]);

  // Follow user location as they move (only if followUserLocation is true and no bus is selected)
  useEffect(() => {
    if (!followUserLocation || !userLocation || !mapRef.current || selectedBusId) {
      return;
    }

    // Don't follow if user recently interacted with the map (within last 2 seconds)
    const timeSinceInteraction = Date.now() - lastUserInteractionTime.current;
    if (isUserInteractingRef.current || timeSinceInteraction < 2000) {
      return;
    }

    const region = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    try {
      mapRef.current.animateToRegion(region, 1000);
    } catch (e) {
      console.warn('Failed to animate to user location:', e?.message || e);
    }
  }, [userLocation, followUserLocation, selectedBusId]);

  // Notify parent when buses are loaded
  useEffect(() => {
    if (onBusesLoaded && buses.length > 0) {
      onBusesLoaded(buses);
    }
  }, [buses, onBusesLoaded]);

  // Setup real-time subscription (recreates when handlers change)
  useEffect(() => {
    if (!supabase) return;

    const subscription = setupRealtimeSubscription();

    return () => {
      if (subscription && supabase) {
        try {
          supabase.removeChannel(subscription);
        } catch (e) {
          console.warn('Error removing Supabase channel:', e?.message || e);
        }
      }
    };
  }, [setupRealtimeSubscription, supabase]);

  // Load routes and buses when dependencies change
  useEffect(() => {
    loadRoutes();
    loadBuses();
  }, [loadRoutes, loadBuses]);

  // Start pulse animation only once on mount
  useEffect(() => {
    startPulseAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - animation doesn't depend on props/context

  // Debug map region
  useEffect(() => {
    if (initialRegion) {
    }
  }, [initialRegion]);

  // Initialize to follow user location if available
  useEffect(() => {
    if (userLocation && !selectedBusId) {
      setFollowUserLocation(true);
      const region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      if (mapRef.current) {
        setTimeout(() => {
          try {
            mapRef.current.animateToRegion(region, 1000);
          } catch (e) {
            console.warn('Failed to initialize user location:', e?.message || e);
          }
        }, 500);
      }
    }
  }, []);

  // Refresh buses every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(loadBuses, 30000);
    return () => clearInterval(interval);
  }, [loadBuses]);

  // Auto-hide loading after 2 seconds as safety fallback
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Loading timeout - forcing loading state to false');
        setLoading(false);
      }, 2000); // 2 second safety timeout
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bus locations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={40} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>
          If you see "Quota exceeded" error, the Google Maps API limit has been reached.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBuses}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fallbackButton} onPress={() => setShowFallback(true)}>
          <Text style={styles.fallbackButtonText}>Show Bus List Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show fallback bus list if map fails or user chooses it
  if (showFallback) {
    return (
      <FallbackBusList
        buses={buses}
        onBusSelect={onBusSelect}
        loading={loading}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        apiKey={getGoogleMapsApiKey()}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        mapType="standard"
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        // Allow full, smooth interaction with the map
        scrollEnabled
        zoomEnabled
        loadingEnabled={false}
        // Disable aggressive caching so gestures always feel responsive
        cacheEnabled={false}
        // Give users a wider zoom range
        maxZoomLevel={20}
        minZoomLevel={0}
        onUserLocationChange={(event) => {
          // Don't auto-follow if user is interacting with the map
          const timeSinceInteraction = Date.now() - lastUserInteractionTime.current;
          if (isUserInteractingRef.current || timeSinceInteraction < 2000) {
            return;
          }
          
          if (followUserLocation && !selectedBusId && event.nativeEvent.coordinate) {
            const newLocation = {
              latitude: event.nativeEvent.coordinate.latitude,
              longitude: event.nativeEvent.coordinate.longitude,
            };
            // Update map region to follow user
            const region = {
              ...newLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            if (mapRef.current) {
              try {
                mapRef.current.animateToRegion(region, 500);
              } catch (e) {
                console.warn('Failed to follow user location:', e?.message || e);
              }
            }
          }
        }}
        onPanDrag={() => {
          // User started dragging the map
          isUserInteractingRef.current = true;
          lastUserInteractionTime.current = Date.now();
          setFollowUserLocation(false);
          // Performance: Removed console.log
        }}
        onRegionChangeComplete={(region) => {
          // User finished moving the map
          const timeSinceInteraction = Date.now() - lastUserInteractionTime.current;
          if (timeSinceInteraction < 100) {
            // This was likely a user interaction, not programmatic
            isUserInteractingRef.current = false;
            // Keep followUserLocation disabled - user manually moved the map
            // Performance: Removed console.log
          } else {
            // This was likely programmatic, reset the flag
            isUserInteractingRef.current = false;
          }
        }}
        onError={(error) => {
          try {
            console.error('Map error:', error);
            const errorMsg = error?.nativeEvent?.message || error?.message || '';
            if (errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
              setError('Map disabled because Quota is EXCEEDED');
            } else if (errorMsg) {
              console.warn('Map error (non-fatal):', errorMsg);
            }
          } catch (e) {
            console.error('Error handling map error:', e);
          }
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            description="Current position"
            tracksViewChanges={false}
          >
            <View style={styles.userMarker}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          </Marker>
        )}
        
        {/* Route pins - showing start and end pins for all routes */}
        {availableRoutes.map((route) => {
          // Only render if route has coordinates
          if (!route.coordinates || route.coordinates.length < 2) {
            // Performance: Removed console.log from render loop
            return null;
          }
          
          // Route rendering optimized - removed console logs for performance
          
          return (
            <RoutePolyline
              key={route.id}
              route={route}
              isVisible={true}
              showStops={true}
              showDirection={false}
              showInfoBubbles={false}
              isSelected={selectedRoute?.id === route.id}
            />
          );
        })}
        
        {/* Bus markers - with error handling */}
        {buses.length > 0 && buses.filter(bus => bus && bus.bus_id && bus.latitude != null && bus.longitude != null).map(renderBusMarker)}
      </MapView>
      
      {/* Re-enable follow user location button */}
      {!followUserLocation && !selectedBusId && userLocation && (
        <TouchableOpacity
          style={styles.followButton}
          onPress={() => {
            setFollowUserLocation(true);
            isUserInteractingRef.current = false;
            lastUserInteractionTime.current = 0;
            if (mapRef.current && userLocation) {
              const region = {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              try {
                mapRef.current.animateToRegion(region, 1000);
              } catch (e) {
                console.warn('Failed to center on user location:', e?.message || e);
              }
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  fallbackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  markerContainer: {
    alignItems: 'center',
  },
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  busIcon: {
    fontSize: 20,
  },
  arrivalInfo: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  arrivalTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  arrivalStatus: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  userMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  followButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default RealtimeBusMap;
