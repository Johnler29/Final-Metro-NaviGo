import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import { useSupabase } from '../contexts/SupabaseContext';
import { validateLocation, calculateDistance } from '../utils/locationUtils';
import RoutePolyline from './RoutePolyline';
import FallbackBusList from './FallbackBusList';
import { getAllRoutes, getRouteById } from '../data/routes';
import { supabaseHelpers } from '../lib/supabase';
import polyline from '@mapbox/polyline';

const { width, height } = Dimensions.get('window');

const RealtimeBusMap = ({ 
  initialRegion, 
  onBusSelect, 
  selectedBusId,
  showArrivalTimes = true,
  showCapacityStatus = true,
  userLocation = null,
  onBusesLoaded = null,
  showRoutes = true,
  selectedRouteId = null,
  onRouteSelect = null,
  showInfoBubbles = true
}) => {
  const { supabase, buses: contextBuses, routes } = useSupabase();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const [locationValidation, setLocationValidation] = useState({});
  const [arrivalTimes, setArrivalTimes] = useState({});
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showFallback, setShowFallback] = useState(false);
  const [demoRouteCoords, setDemoRouteCoords] = useState([]);
  const [followUserLocation, setFollowUserLocation] = useState(true);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const userLocationRef = useRef(userLocation);
  const selectedBusRef = useRef(null);

  const getGoogleMapsApiKey = () => {
    return (
      Constants?.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ||
      Constants?.manifest?.extra?.GOOGLE_MAPS_API_KEY ||
      undefined
    );
  };

  // Demo: fetch a point-to-point route using Google Directions API
  // Point A: Robinsons Place Dasmariñas
  // Point B: Robinsons Place Imus
  const fetchDemoPointToPointRoute = useCallback(async () => {
    try {
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) {
        console.warn('Google Maps API key not available for Directions request');
        return;
      }

      const origin = encodeURIComponent('Robinsons Place Dasmarinas, Cavite, Philippines');
      const destination = encodeURIComponent('Robinsons Place Imus, Cavite, Philippines');

      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}` +
        `&destination=${destination}` +
        `&mode=driving` +
        `&key=${apiKey}`;

      console.log('🚗 Fetching demo Directions route:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        console.warn('Directions API returned no routes:', data.status, data.error_message);
        return;
      }

      const overviewPolyline = data.routes[0].overview_polyline?.points;
      if (!overviewPolyline) {
        console.warn('No overview polyline found in Directions response');
        return;
      }

      const decodedPoints = polyline.decode(overviewPolyline);
      const coords = decodedPoints.map(([latitude, longitude]) => ({
        latitude,
        longitude,
      }));

      console.log('✅ Demo Directions route loaded with', coords.length, 'points');
      setDemoRouteCoords(coords);
    } catch (err) {
      console.error('Error fetching demo Directions route:', err);
    }
  }, []);

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
      console.log('✅ Loaded routes:', routes.length);
      
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
        console.log('⚠️ No buses available in context');
        setBuses([]);
        return;
      }
      
      console.log('🎯 RealtimeBusMap - Loading buses from context:', contextBuses.length);
      
      // Transform buses to match expected format - only show buses with active drivers/trips
      const transformedBuses = contextBuses.map(bus => {
        const route = routes?.find(r => r.id === bus.route_id);
        
        // Check if bus has an active driver session
        const hasActiveDriver = bus.driver_id && bus.status === 'active';
        const hasRecentLocation = bus.last_location_update && 
          new Date(bus.last_location_update) > new Date(Date.now() - 5 * 60 * 1000); // Within last 5 minutes (stricter)
        const hasValidCoordinates = bus.latitude && bus.longitude && 
          !isNaN(bus.latitude) && !isNaN(bus.longitude);
        
        // Check if driver is actually online (has recent activity)
        const isDriverOnline = hasRecentLocation && hasValidCoordinates;
        
        // Debug logging for each bus
        console.log('🎯 RealtimeBusMap - Bus filter check:', {
          bus_number: bus.bus_number,
          driver_id: bus.driver_id,
          status: bus.status,
          hasActiveDriver,
          hasRecentLocation,
          hasValidCoordinates,
          isDriverOnline,
          lastUpdate: bus.last_location_update,
          coords: { lat: bus.latitude, lng: bus.longitude }
        });
        
        // Only show buses with active drivers AND recent location updates (driver is online)
        if (!hasActiveDriver || !isDriverOnline) {
          console.log('🎯 RealtimeBusMap - Skipping bus - driver offline or no recent location:', bus.bus_number, 'driver:', bus.driver_id, 'status:', bus.status, 'recent:', hasRecentLocation, 'coords:', bus.latitude, bus.longitude);
          return null;
        }
        
        // Get coordinates directly from the buses table
        let lat = bus.latitude;
        let lng = bus.longitude;
        
        // Fallback: if no coords, use sample coordinates
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          console.log('🚌 No valid coordinates for bus, using fallback location');
          const sampleCoords = [
            { lat: 14.3294, lng: 120.9366 }, // Dasmarinas Terminal
            { lat: 14.4591, lng: 120.9468 }, // Bacoor
            { lat: 14.5995, lng: 120.9842 }  // Manila City Hall
          ];
          const randomCoord = sampleCoords[Math.floor(Math.random() * sampleCoords.length)];
          lat = randomCoord.lat;
          lng = randomCoord.lng;
          console.log('🚌 Using sample coordinates:', lat, lng);
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
          capacity_status: (bus.capacity_percentage || 0) >= 90 ? 'full' : 
                          (bus.capacity_percentage || 0) >= 70 ? 'crowded' : 
                          (bus.capacity_percentage || 0) >= 40 ? 'moderate' : 'light',
          is_moving: (bus.tracking_status || 'moving') === 'moving',
          last_location_update: bus.updated_at || new Date().toISOString(),
          validation: { isValid: true, reason: 'context_data' }
        };
        
        console.log('🎯 RealtimeBusMap - Transformed bus:', transformedBus.bus_name, 'at', transformedBus.latitude, transformedBus.longitude);
        return transformedBus;
      }).filter(bus => {
        if (!bus) return false; // Filter out null buses (inactive drivers)
        const isValid = typeof bus.latitude === 'number' && typeof bus.longitude === 'number';
        console.log('🎯 RealtimeBusMap - Bus filter check:', bus.bus_name, 'Valid:', isValid);
        return isValid;
      });
      
      console.log('✅ Loaded buses from context:', transformedBuses.length, 'buses');
      setBuses(transformedBuses);
      
      setLastUpdate(new Date());
      
      // Calculate arrival times if passenger location is available
      if (showArrivalTimes && initialRegion) {
        await calculateArrivalTimesForBuses(transformedBuses);
      }
      
      fadeInBus();
      
    } catch (err) {
      console.error('Error loading buses:', err);
      setError('Failed to load bus locations');
    } finally {
      setLoading(false);
    }
  }, [contextBuses, routes, initialRegion, showArrivalTimes]);

  // Refresh buses function for real-time updates
  const refreshBuses = useCallback(async () => {
    console.log('🔄 Refreshing buses due to location update...');
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
    if (!initialRegion || !supabase) return;
    
    try {
      const arrivalPromises = busList.map(async (bus) => {
        const { data, error } = await supabase.rpc('calculate_arrival_times', {
          p_bus_id: bus.bus_id,
          p_passenger_lat: initialRegion.latitude,
          p_passenger_lng: initialRegion.longitude
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
      return;
    }

    // Check if supabase has real-time capabilities
    if (!supabase.channel) {
      console.error('Supabase real-time not available - channel method missing');
      return;
    }

    try {
      console.log('🎯 RealtimeBusMap - Setting up real-time subscription for buses table');
      console.log('🎯 Supabase client:', supabase);
      console.log('🎯 Supabase URL:', supabase.supabaseUrl);
      
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
            table: 'buses',
            filter: 'tracking_status=eq.moving'
          }, 
          (payload) => {
            console.log('🎯 Real-time bus update received (moving buses only):', payload);
            handleBusUpdate(payload);
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'buses',
            filter: 'tracking_status=eq.stopped'
          },
          (payload) => {
            console.log('🎯 Real-time bus update received (stopped buses):', payload);
            handleBusUpdate(payload);
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'buses'
            // No filter - catch all bus updates (including location changes)
          },
          (payload) => {
            console.log('🎯 Real-time bus update received (all buses):', payload);
            // Only handle if it's a location update (latitude/longitude changed)
            if (payload.new.latitude != null && payload.new.longitude != null) {
              handleBusUpdate(payload);
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
            console.log('🎯 Real-time bus insert received:', payload);
            handleBusInsert(payload);
          }
        )
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'location_updates'
          },
          (payload) => {
            console.log('🎯 Real-time location update received:', payload);
            // Refresh buses data when new location update is inserted
            refreshBuses();
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
            console.log('🎯 Real-time bus went offline:', payload);
            // Remove offline buses from the map
            setBuses(prevBuses => 
              prevBuses.filter(bus => bus.bus_id !== payload.new.id)
            );
          }
        )
        .subscribe((status) => {
          console.log('🎯 Real-time subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription is active and ready to receive updates');
            // Test the subscription by triggering a test update
            setTimeout(() => {
              console.log('🧪 Testing real-time subscription...');
              // This will help verify if real-time is working
            }, 2000);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription failed - check if real-time is enabled for buses table');
            console.error('💡 Run the SQL script: sql/enable-realtime-bus-tracking.sql');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Real-time subscription timed out');
          } else if (status === 'CLOSED') {
            console.error('❌ Real-time subscription closed');
          } else {
            console.log('🎯 Real-time subscription status:', status);
          }
        });

      setRealtimeSubscription(subscription);
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      console.error('Error details:', error.message, error.stack);
      console.error('💡 Make sure real-time is enabled for the buses table in Supabase');
    }
  }, [supabase, refreshBuses]);

  // Handle bus updates from real-time subscription
  const handleBusUpdate = useCallback(async (payload) => {
    try {
      console.log('🎯 Handling bus update:', payload);
      const updatedBus = payload.new;
      const busId = updatedBus.id;
      
      // Check if driver went off duty - validate coordinates and driver status
      const hasValidCoordinates = updatedBus.latitude != null && 
                                   updatedBus.longitude != null &&
                                   !isNaN(updatedBus.latitude) && 
                                   !isNaN(updatedBus.longitude);
      const hasActiveDriver = updatedBus.driver_id && 
                              (updatedBus.status === 'active' || updatedBus.status === undefined);
      const isDriverOffline = !hasActiveDriver || !hasValidCoordinates;
      
      // Check if bus has recent location update (within last 5 minutes)
      const hasRecentLocation = updatedBus.last_location_update && 
        new Date(updatedBus.last_location_update) > new Date(Date.now() - 5 * 60 * 1000);
      
      // If driver went off duty or coordinates are invalid, remove bus from map
      if (isDriverOffline || !hasRecentLocation) {
        console.log('🚫 Driver went off duty or bus went offline, removing from map:', busId);
        setBuses(prevBuses => prevBuses.filter(bus => bus.bus_id !== busId));
        return;
      }
      
      // Update bus in state
      setBuses(prevBuses => {
        const updatedBuses = prevBuses.map(bus => {
          if (bus.bus_id === busId) {
            console.log('🎯 Updating existing bus:', busId, 'New coords:', updatedBus.latitude, updatedBus.longitude);
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
        
        // If bus not in current list, add it only if it has valid data
        if (!prevBuses.find(bus => bus.bus_id === busId) && hasValidCoordinates && hasActiveDriver) {
          console.log('🎯 Adding new bus from real-time update:', busId);
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
        
        // Filter out any buses with invalid coordinates (safety check)
        return updatedBuses.filter(bus => 
          bus.latitude != null && 
          bus.longitude != null && 
          !isNaN(bus.latitude) && 
          !isNaN(bus.longitude)
        );
      });
      
    } catch (err) {
      console.error('Error handling bus update:', err);
    }
  }, [routes]);

  // Handle bus inserts from real-time subscription
  const handleBusInsert = useCallback(async (payload) => {
    try {
      console.log('🎯 Handling bus insert:', payload);
      const newBus = payload.new;
      const busId = newBus.id;
      
      // Validate bus data before adding
      const hasValidCoordinates = newBus.latitude != null && 
                                   newBus.longitude != null &&
                                   !isNaN(newBus.latitude) && 
                                   !isNaN(newBus.longitude);
      const hasActiveDriver = newBus.driver_id && 
                              (newBus.status === 'active' || newBus.status === undefined);
      
      // Only add bus if it has valid coordinates and active driver
      if (!hasValidCoordinates || !hasActiveDriver) {
        console.log('🚫 Skipping bus insert - invalid coordinates or inactive driver:', busId);
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
        
        console.log('🎯 Adding new bus from insert:', transformedBus.bus_name);
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

  // Render bus marker
  const renderBusMarker = (bus) => {
    const isSelected = selectedBusId === bus.bus_id;
    const markerColor = getBusMarkerColor(bus);
    
    // Debug logging
    console.log('🎯 RealtimeBusMap - Rendering bus marker:', bus.bus_id, bus.bus_name, 'at', bus.latitude, bus.longitude);
    if (isSelected) {
      console.log('🎯 RealtimeBusMap - This is the selected bus!');
    }
    
    return (
      <Marker
        key={bus.bus_id}
        coordinate={{
          latitude: bus.latitude,
          longitude: bus.longitude
        }}
        title={bus.bus_name}
        description={`${bus.route_name || 'Unknown Route'} • ${bus.capacity_status || 'unknown'} • ${bus.location_status || 'unknown'}`}
        onPress={() => {
          console.log('🎯 RealtimeBusMap - Bus marker pressed:', bus.bus_id);
          if (onBusSelect) {
            onBusSelect(bus);
          }
        }}
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
  };

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
      console.log('🎯 RealtimeBusMap - Focusing on selected bus:', selectedBusId);
      setFollowUserLocation(false); // Stop following user when bus is selected
      console.log('🎯 RealtimeBusMap - Available bus IDs:', buses.map(bus => bus.bus_id));
      const selectedBus = buses.find(bus => bus.bus_id === selectedBusId);
      if (selectedBus) {
        console.log('🎯 RealtimeBusMap - Found selected bus:', selectedBus.bus_name, 'at', selectedBus.latitude, selectedBus.longitude);
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
        console.log('🎯 RealtimeBusMap - Selected bus not found in buses');
        console.log('🎯 RealtimeBusMap - Looking for:', selectedBusId);
        console.log('🎯 RealtimeBusMap - Available buses:', buses.map(bus => ({ id: bus.bus_id, name: bus.bus_name })));
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
            // Smoothly follow the selected bus as it moves
            mapRef.current.animateToRegion(region, 1000);
            console.log('📍 RealtimeBusMap - Following selected bus:', selectedBus.bus_name, 'at', selectedBus.latitude, selectedBus.longitude);
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

    console.log('📍 RealtimeBusMap - Following user location:', userLocation.latitude, userLocation.longitude);
    
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

  // Load buses and routes on mount
  useEffect(() => {
    loadRoutes();
    loadBuses();
    setupRealtimeSubscription();
    startPulseAnimation();
    // Load a demo point-to-point route between Robinsons Dasmariñas and Robinsons Imus
    fetchDemoPointToPointRoute();
    
    return () => {
      if (realtimeSubscription && supabase) {
        supabase.removeChannel(realtimeSubscription);
      }
    };
  }, []);

  // Debug map region
  useEffect(() => {
    if (initialRegion) {
      console.log('🎯 RealtimeBusMap - Initial map region:', initialRegion);
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
        showsMyLocationButton
        showsCompass
        showsScale
        mapType="standard"
        onUserLocationChange={(event) => {
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
        onError={(error) => {
          console.error('Map error:', error);
          if (error.nativeEvent?.message?.includes('quota') || 
              error.nativeEvent?.message?.includes('exceeded')) {
            setError('Map disabled because Quota is EXCEEDED');
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
          >
            <View style={styles.userMarker}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          </Marker>
        )}
        
        {/* Static route polylines from database/fallback */}
        {showRoutes && availableRoutes.map((route) => (
          <RoutePolyline
            key={route.id}
            route={route}
            isVisible={!selectedRoute || selectedRoute.id === route.id}
            showStops={true}
            showDirection={true}
            showInfoBubbles={showInfoBubbles}
            isSelected={selectedRoute?.id === route.id}
            onStopPress={(stop, index) => {
              console.log('Stop pressed:', stop.name, 'at index:', index);
            }}
          />
        ))}

        {/* Demo point-to-point route: Robinsons Dasmariñas → Robinsons Imus */}
        {demoRouteCoords.length > 0 && (
          <Polyline
            coordinates={demoRouteCoords}
            strokeColor="#EF4444"
            strokeWidth={5}
          />
        )}

        {/* Bus markers */}
        {console.log('🎯 RealtimeBusMap - Rendering', buses.length, 'bus markers')}
        {buses.length > 0 ? buses.map(renderBusMarker) : (
          <Marker
            coordinate={{ latitude: 14.4791, longitude: 120.8969 }}
            title="Test Marker"
            description="This is a test marker to verify map rendering"
          >
            <View style={[styles.busMarker, { backgroundColor: 'red' }]}>
              <Text style={styles.busIcon}>🚌</Text>
            </View>
          </Marker>
        )}
      </MapView>
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
});

export default RealtimeBusMap;
