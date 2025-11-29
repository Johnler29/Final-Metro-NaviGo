import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  AppState,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSupabase } from '../contexts/SupabaseContext';
import { colors, spacing, radius, shadows } from '../styles/uiTheme';

export default function DriverMapScreen({ navigation, route }) {
  const TRACKING_FLAG_KEY = 'isTrackingActive';
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isOnRoute, setIsOnRoute] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [driverSession, setDriverSession] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [pingLocation, setPingLocation] = useState(null);
  const [pingUserInfo, setPingUserInfo] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
  const locationSubscription = useRef(null); // legacy watcher (not used in polling mode)
  const locationInterval = useRef(null);     // active 5s polling timer
  const { updateBusLocation, startDriverSession, endDriverSession, getStopsByRoute, routes, buses, driverBusAssignments } = useSupabase();
  
  // Animation values for card slide-up and button press feedback
  const cardSlideAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef({ recalc: new Animated.Value(1), info: new Animated.Value(1) }).current;

  useEffect(() => {
    getLocation();
    initializeDriverSession();
    restoreTrackingState();
    
    // Check for ping location from route params
    if (route?.params?.pingLocation) {
      const { latitude, longitude, address, userName } = route.params.pingLocation;
      setPingLocation({ latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
      setPingUserInfo({ address, userName });
      console.log('📍 Ping location received:', { latitude, longitude, address, userName });
    }
    
    // Animate card slide-up on mount
    Animated.spring(cardSlideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
      delay: 300,
    }).start();
    
    // Handle app state changes for background tracking
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' && isTracking) {
        console.log('📱 App went to background, continuing location tracking...');
      } else if (nextAppState === 'active' && isTracking) {
        console.log('📱 App came to foreground, resuming location tracking...');
        processOfflineQueue();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      stopLocationTracking();
    };
  }, [route?.params?.pingLocation]);

  // Auto-start/stop location tracking based on trip status
  useEffect(() => {
    if (driverSession && driverSession.status === 'active') {
      // Trip is active, start location tracking automatically
      console.log('🚀 Trip is active, starting location tracking automatically');
      startLocationTracking();
    } else if (driverSession && driverSession.status !== 'active') {
      // Trip is not active, stop location tracking
      console.log('⏹️ Trip is not active, stopping location tracking');
      stopLocationTracking();
    }
  }, [driverSession]);

  // Also check for trip status from AsyncStorage on component mount
  useEffect(() => {
    const checkTripStatus = async () => {
      try {
        const tripData = await AsyncStorage.getItem('currentTrip');
        if (tripData) {
          const trip = JSON.parse(tripData);
          console.log('🚌 Found active trip in storage:', trip);
          // If we have an active trip but no driver session, try to restore it
          if (!driverSession && trip.busId) {
            console.log('🔄 Attempting to restore driver session for active trip');
            // This will trigger the location tracking to start
          }
        }
      } catch (error) {
        console.error('❌ Error checking trip status:', error);
      }
    };
    
    checkTripStatus();
  }, []);

  // Restore persisted tracking flag
  const restoreTrackingState = async () => {
    try {
      const flag = await AsyncStorage.getItem(TRACKING_FLAG_KEY);
      if (flag === 'true') {
        console.log('🔁 Restoring tracking state from storage...');
        // Only start if we have a session
        if (driverSession && !locationSubscription.current) {
          await startLocationTracking();
        } else if (!driverSession) {
          console.log('ℹ️ Tracking flagged but no session found. Waiting for session.');
        }
      }
    } catch (e) {
      console.log('⚠️ Failed to restore tracking flag:', e);
    }
  };

  // Initialize driver session
  const initializeDriverSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('driverSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setDriverSession(session);
        console.log('✅ Driver session restored:', session);
      }
    } catch (error) {
      console.error('❌ Error restoring driver session:', error);
    }
  };

  // Start location tracking
  const startLocationTracking = async () => {
    if (!driverSession) {
      Alert.alert('No Active Session', 'Please start a trip first to enable location tracking.');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for tracking.');
        return;
      }

      setIsTracking(true);
      await AsyncStorage.setItem(TRACKING_FLAG_KEY, 'true');

      // Clear any existing interval
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
      }

      // Poll current position every 3 seconds for more frequent updates
      locationInterval.current = setInterval(async () => {
        try {
          console.log('⏱️ Tick: requesting current position');
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High, // Higher accuracy for real-time tracking
            maximumAge: 10000, // Accept location up to 10 seconds old
            timeout: 15000 // 15 second timeout
          });
          await handleLocationUpdate(current);
        } catch (e) {
          console.log('❌ Error during interval location fetch:', e);
        }
      }, 1500); // Reduced to 1.5 seconds for smooth real-time updates

      console.log('✅ Location tracking started (1.5s polling with high accuracy)');
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
    setIsTracking(false);
    AsyncStorage.setItem(TRACKING_FLAG_KEY, 'false').catch(() => {});
    console.log('🛑 Location tracking stopped');
  };

  // Handle location updates
  const handleLocationUpdate = async (location) => {
    console.log('📍 handleLocationUpdate called with:', location);
    
    if (!driverSession) {
      console.log('❌ No driver session found in handleLocationUpdate');
      return;
    }

    console.log('✅ Driver session found:', driverSession.id);

    // Update location accuracy for UI display
    setLocationAccuracy(location.coords.accuracy);

    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
      heading: location.coords.heading,
      timestamp: new Date().toISOString(),
      sessionId: driverSession.id,
      busId: driverSession.bus_id,
      driverId: driverSession.driver_id
    };

    console.log('📍 Updating bus location:', locationData);

    try {
      // Try to send location update to server
      await updateBusLocation(locationData);
      console.log('✅ Location update sent successfully');
      
      // Process any queued offline updates
      if (offlineQueue.length > 0) {
        await processOfflineQueue();
      }
    } catch (error) {
      console.error('❌ Error sending location update:', error);
      const messageText = String(error?.message || '');
      const isInvalidSession = error?.code === 'P0001' || messageText.toLowerCase().includes('invalid or inactive session');
      if (isInvalidSession) {
        try {
          console.log('🔁 Attempting to refresh driver session and retry...');
          const newSession = await startDriverSession(driverSession.driver_id, driverSession.bus_id);
          await AsyncStorage.setItem('driverSession', JSON.stringify(newSession));
          setDriverSession(newSession);
          const retryPayload = { ...locationData, sessionId: newSession.id };
          await updateBusLocation(retryPayload);
          console.log('✅ Location update succeeded after session refresh');
          return;
        } catch (retryError) {
          console.error('❌ Retry after session refresh failed:', retryError);
          stopLocationTracking();
          Alert.alert('Session issue', 'Could not refresh session. Please end trip and start again.');
          return;
        }
      }

      // Store for offline processing
      await storeOfflineLocation(locationData);
    }
  };

  // Store location for offline processing
  const storeOfflineLocation = async (locationData) => {
    try {
      const newQueue = [...offlineQueue, locationData];
      setOfflineQueue(newQueue);
      await AsyncStorage.setItem('offlineLocations', JSON.stringify(newQueue));
      console.log('📦 Location stored for offline processing');
    } catch (error) {
      console.error('❌ Error storing offline location:', error);
    }
  };

  // Process queued offline locations
  const processOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    console.log(`📤 Processing ${offlineQueue.length} offline locations...`);
    
    for (const locationData of offlineQueue) {
      try {
        await updateBusLocation(locationData);
        console.log('✅ Offline location sent successfully');
      } catch (error) {
        console.error('❌ Error sending offline location:', error);
        break; // Stop processing if we hit an error
      }
    }

    // Clear processed locations
    setOfflineQueue([]);
    await AsyncStorage.removeItem('offlineLocations');
  };

  const getLocation = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      
      console.log('📍 Requesting location permissions...');
      
      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        console.log('❌ Location services are disabled');
        setErrorMsg('Location services are disabled. Please enable GPS in your device settings.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Location services are enabled');
      
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        setErrorMsg('Permission to access location was denied. Please allow location access in app settings.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Location permission granted');

      // Get current location with high accuracy options
      const locationOptions = {
        accuracy: Location.Accuracy.Highest, // Highest accuracy for real-time tracking
        timeInterval: 5000, // 5 seconds timeout
        distanceInterval: 10, // 10 meters for more sensitive updates
        maximumAge: 10000, // Accept location up to 10 seconds old
      };

      console.log('📍 Getting current location...');
      const currentLocation = await Location.getCurrentPositionAsync(locationOptions);
      
      console.log('✅ Current location obtained:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        timestamp: new Date(currentLocation.timestamp).toLocaleString()
      });
      
      setLocation(currentLocation);
      
      // Load real route data
      await loadRouteData(currentLocation);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error getting location:', error);
      setErrorMsg(`Failed to get your location: ${error.message}. Please check your GPS settings and try again.`);
      setIsLoading(false);
    }
  };

  const loadRouteData = async (currentLocation) => {
    try {
      // Get the current driver's assigned bus and route
      const driverSession = await AsyncStorage.getItem('driverSession');
      if (!driverSession) {
        console.log('No driver session found, using mock route');
        loadMockRoute(currentLocation);
        return;
      }

      const session = JSON.parse(driverSession);
      const assignment = driverBusAssignments.find(a => a.drivers?.id === session.driver_id);
      
      if (!assignment) {
        console.log('No bus assignment found, using mock route');
        loadMockRoute(currentLocation);
        return;
      }

      // Use the bus data from the assignment (which includes nested route info)
      const bus = assignment.buses;
      if (!bus || !bus.route_id) {
        console.log('No route found for bus, using mock route');
        loadMockRoute(currentLocation);
        return;
      }

      // Get stops for the assigned route
      const stops = await getStopsByRoute(bus.route_id);
      
      if (stops && stops.length > 0) {
        // Convert stops to coordinates
        const routeCoords = stops.map(stop => ({
          latitude: parseFloat(stop.latitude),
          longitude: parseFloat(stop.longitude),
          stopName: stop.stop_name,
          stopDescription: stop.stop_description
        }));
        
        console.log('✅ Real route loaded:', routeCoords.length, 'stops');
        setRouteCoordinates(routeCoords);
      } else {
        console.log('No stops found for route, using mock route');
        loadMockRoute(currentLocation);
      }
    } catch (error) {
      console.error('❌ Error loading route data:', error);
      loadMockRoute(currentLocation);
    }
  };

  const loadMockRoute = (currentLocation) => {
    // Fallback to mock route if real data is not available
    const mockRoute = [
      {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        stopName: 'Current Location',
        stopDescription: 'Starting point'
      },
      {
        latitude: currentLocation.coords.latitude + 0.002,
        longitude: currentLocation.coords.longitude + 0.002,
        stopName: 'Stop 1',
        stopDescription: 'First waypoint'
      },
      {
        latitude: currentLocation.coords.latitude + 0.004,
        longitude: currentLocation.coords.longitude + 0.004,
        stopName: 'Stop 2',
        stopDescription: 'Second waypoint'
      },
      {
        latitude: currentLocation.coords.latitude + 0.006,
        longitude: currentLocation.coords.longitude + 0.006,
        stopName: 'Final Destination',
        stopDescription: 'End point'
      },
    ];
    setRouteCoordinates(mockRoute);
  };

  const getGoogleMapsApiKey = () => {
    return (
      Constants?.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ||
      Constants?.manifest?.extra?.GOOGLE_MAPS_API_KEY ||
      undefined
    );
  };

  const handleRetry = () => {
    setErrorMsg(null);
    getLocation();
  };

  const handleUseDefaultLocation = () => {
    // Use a default location (New York City)
    setLocation({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 100,
        altitude: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });
    setErrorMsg(null);
  };

  const handleRouteDeviation = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim.recalc, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim.recalc, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    Alert.alert(
      'Route Deviation',
      'You are currently off your assigned route. Would you like to recalculate?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Recalculate', onPress: () => Alert.alert('Recalculating', 'Route is being recalculated...') }
      ]
    );
  };

  const handleInfoPress = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim.info, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim.info, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Add your info action here
    Alert.alert('Route Information', 'Detailed route information will be displayed here.');
  };

  const handleMenuPress = () => {
    navigation.getParent()?.openDrawer();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={64} color={colors.danger} />
          <Text style={styles.errorTitle}>Location Error</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <View style={styles.errorButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.defaultButton} onPress={handleUseDefaultLocation}>
              <Text style={styles.defaultButtonText}>Use Default Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Calculate initial region based on ping location or driver location
  const getInitialRegion = () => {
    if (pingLocation) {
      // If ping location exists, center on it or include both locations
      const centerLat = location 
        ? (location.coords.latitude + pingLocation.latitude) / 2
        : pingLocation.latitude;
      const centerLng = location
        ? (location.coords.longitude + pingLocation.longitude) / 2
        : pingLocation.longitude;
      
      // Calculate delta to include both locations if driver location exists
      const latDelta = location
        ? Math.abs(location.coords.latitude - pingLocation.latitude) * 2.5 || 0.01
        : 0.01;
      const lngDelta = location
        ? Math.abs(location.coords.longitude - pingLocation.longitude) * 2.5 || 0.01
        : 0.01;
      
      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      };
    }
    
    return location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
    };
  };

  const initialRegion = getInitialRegion();

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={colors.background} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Route Navigation</Text>
              {driverSession?.status === 'active' && (
                <View style={styles.headerStatusIndicator}>
                  <View style={styles.headerStatusDot} />
                  <Text style={styles.headerStatusText}>Live</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={22} color={colors.background} />
            </TouchableOpacity>
          </View>
          
          {/* Location Accuracy Indicator - Enhanced */}
          {locationAccuracy && (
            <View style={[
              styles.accuracyContainer,
              {
                backgroundColor: locationAccuracy <= 10 ? colors.brandSoft : locationAccuracy <= 20 ? colors.brandSoft : colors.brandSoft,
                borderColor: locationAccuracy <= 10 ? colors.success : locationAccuracy <= 20 ? colors.brand : colors.danger,
              }
            ]}>
              <View style={[
                styles.accuracyIconContainer,
                {
                  backgroundColor: locationAccuracy <= 10 ? colors.success : locationAccuracy <= 20 ? colors.brand : colors.danger,
                }
              ]}>
                <Ionicons 
                  name="location" 
                  size={14} 
                  color={colors.background} 
                />
              </View>
              <Text style={[
                styles.accuracyText,
                {
                  color: locationAccuracy <= 10 ? colors.textPrimary : locationAccuracy <= 20 ? colors.textPrimary : colors.textPrimary,
                }
              ]}>
                {locationAccuracy <= 10 ? "High" : locationAccuracy <= 20 ? "Medium" : "Low"} Accuracy
                <Text style={styles.accuracyValue}> • {Math.round(locationAccuracy)}m</Text>
              </Text>
            </View>
          )}
        </View>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        apiKey={getGoogleMapsApiKey()}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={true}
        userLocationPriority="high"
        userLocationUpdateInterval={10000}
        userLocationFastestInterval={5000}
        onMapReady={() => {
          console.log('🗺️ Driver map ready');
          setIsMapReady(true);
        }}
        onError={(e) => {
          console.warn('MapView error:', e?.nativeEvent || e);
          Alert.alert('Map Error', 'There was an error loading the map. Please try again.');
        }}
        onRegionChangeComplete={() => {}}
        moveOnMarkerPress={false}
        toolbarEnabled={false}
        zoomControlEnabled={false}
      >
        {/* User location marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Your Location"
            description="You are here"
            pinColor="orange"
          />
        )}

        {/* Route polyline - disabled (we no longer show route on driver map) */}
        {false && routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.brand}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}

        {/* Route markers - disabled (we no longer show route stops) */}
        {false && routeCoordinates.map((coord, index) => (
          <Marker
            key={index}
            coordinate={coord}
            title={coord.stopName || `Route Point ${index + 1}`}
            description={coord.stopDescription || "Route waypoint"}
            pinColor={index === 0 ? "green" : index === routeCoordinates.length - 1 ? "red" : "orange"}
          />
        ))}

        {/* Ping user location marker */}
        {isMapReady && pingLocation && pingLocation.latitude && pingLocation.longitude && 
         !isNaN(pingLocation.latitude) && !isNaN(pingLocation.longitude) && (
          <Marker
            coordinate={pingLocation}
            title={pingUserInfo?.userName ? `${pingUserInfo.userName}'s Location` : "Passenger Location"}
            description={pingUserInfo?.address || "User ping location"}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.info,
              borderWidth: 3,
              borderColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              ...shadows.floating,
            }}>
              <Ionicons name="person" size={20} color={colors.background} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Minimalist Route Info Card */}
      <Animated.View 
        style={[
          styles.routePanel,
          {
            transform: [
              {
                translateY: cardSlideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: cardSlideAnim,
          },
        ]}
      >
        {/* Compact Header */}
        <View style={styles.routeHeader}>
          <Text style={styles.routeTitle}>Route 101</Text>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: driverSession?.status === 'active' 
                ? colors.brandSoft 
                : colors.surfaceSubtle,
            }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: driverSession?.status === 'active' ? colors.success : colors.textMuted }
            ]} />
            <Text style={[
              styles.statusBadgeText,
              { color: driverSession?.status === 'active' ? colors.textPrimary : colors.textMuted }
            ]}>
              {driverSession?.status === 'active' ? 'Trip Active' : 'No Trip'}
            </Text>
          </View>
        </View>
        
        {/* Single Row Metrics with Dot Dividers */}
        <View style={styles.routeStats}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time-outline" size={14} color={colors.brand} />
            </View>
            <Text style={styles.statText}>15 min</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="speedometer-outline" size={14} color={colors.brand} />
            </View>
            <Text style={styles.statText}>25 km/h</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={14} color={colors.brand} />
            </View>
            <Text style={styles.statText}>32</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="location-outline" size={14} color={colors.brand} />
            </View>
            <Text style={styles.statText} numberOfLines={1}>Central</Text>
          </View>
        </View>

        {/* Minimalist Pill Buttons */}
        <View style={styles.actionButtons}>
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim.recalc }] }}>
            <TouchableOpacity 
              style={styles.actionButtonPrimary} 
              onPress={handleRouteDeviation}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={colors.background} />
              <Text style={styles.actionButtonPrimaryText}>Recalc</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim.info }] }}>
            <TouchableOpacity 
              style={styles.actionButtonSecondary} 
              onPress={handleInfoPress}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.actionButtonSecondaryText}>Info</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.brand,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 0,
    ...shadows.card,
  },
  headerContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    color: colors.background,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  headerStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    marginTop: spacing.sm,
  },
  accuracyIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  accuracyText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0.2,
  },
  accuracyValue: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 20,
    color: colors.textMuted,
    fontWeight: '500',
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.danger,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    fontWeight: '500',
    fontFamily: 'System',
    lineHeight: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.floating,
    flex: 1,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
  },
  defaultButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.floating,
    flex: 1,
  },
  defaultButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
  },
  routePanel: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.floating,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    height: 44,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginLeft: spacing.xs,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    height: 44,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionButtonSecondaryText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginLeft: spacing.xs,
  },
}); 