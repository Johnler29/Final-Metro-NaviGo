import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// MapView now handled by RealtimeBusMap component
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useSupabase } from '../contexts/SupabaseContext';
import { supabaseHelpers } from '../lib/supabase';
import RealtimeBusMap from '../components/RealtimeBusMap';
import RealtimeTest from '../components/RealtimeTest';
import SetAlarmModal from '../components/SetAlarmModal';
import RouteInfoPanel from '../components/RouteInfoPanel';
import PingModal from '../components/PingModal';
import { getLocationStatus, getCapacityStatus, formatDistance, formatTime } from '../utils/locationUtils';
import { getAllRoutes, getRouteById } from '../data/routes';

export default function MapScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mapBuses, setMapBuses] = useState([]);
  const [showTest, setShowTest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState(route?.params?.selectedBusId || null);
  const [trackingBus, setTrackingBus] = useState(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  // Always use real-time mode - no manual mode needed
  const [arrivalTimes, setArrivalTimes] = useState({});
  // Route selection state
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [showSetAlarmModal, setShowSetAlarmModal] = useState(false);
  // Route planner state
  const [showRouteInfoPanel, setShowRouteInfoPanel] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  // Ping modal state
  const [showPingModal, setShowPingModal] = useState(false);
  
  // Keep selected bus in sync when navigating with params
  useEffect(() => {
    // debug only
    // console.log('Selected bus from route params:', route?.params?.selectedBusId);
  }, [route?.params?.selectedBusId, selectedBusId]);

  // Update selectedBusId when route params change
  useEffect(() => {
    if (route?.params?.selectedBusId !== selectedBusId) {
      setSelectedBusId(route?.params?.selectedBusId || null);
    }
  }, [route?.params?.selectedBusId]);

  // Get data from Supabase context
  const { 
    buses, 
    routes, 
    loading: dataLoading, 
    error: dataError, 
    refreshData 
  } = useSupabase();

  useEffect(() => {
    getLocation();
    loadRoutes();

    // Start continuous location updates (throttled to avoid freezing UI)
    let subscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          // Balanced accuracy is enough for passenger view and lighter on the JS thread
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds instead of every 1 second
          distanceInterval: 10, // Update when user moves ~10 meters instead of 1 meter
          mayShowUserSettingsDialog: true,
        },
        (pos) => {
          // Keep latest location in state; heavy map logic is handled inside RealtimeBusMap
          setLocation(pos);
        }
      );
    })();

    return () => {
      // Cleanup watcher
      try { subscription && subscription.remove && subscription.remove(); } catch (_) {}
    };
  }, []);

  // Load available routes
  const loadRoutes = async () => {
    try {
      const routes = await getAllRoutes(supabaseHelpers);
      setAvailableRoutes(routes);
    } catch (err) {
      console.error('Error loading routes:', err);
    }
  };

  useEffect(() => {
    if (buses.length > 0 && routes.length > 0) {
      loadBuses();
    }
  }, [buses, routes]);

  // Focus on selected bus when mapBuses are loaded
  // This is now handled by RealtimeBusMap component
  useEffect(() => {
    if (selectedBusId && mapBuses.length > 0) {
      // debug only
      // console.log('Selected bus ID:', selectedBusId);
    }
  }, [selectedBusId, mapBuses]);

  const loadBuses = async () => {
    try {
      // Transform database buses to map format - only show buses with active drivers/trips
      // IMPORTANT: Preserve existing coordinates to prevent snapping back to user location
      setMapBuses(prevMapBuses => {
        const prevMap = new Map(prevMapBuses.map(b => [b.id, b]));
        
        // CRITICAL: Also remove buses from prevMapBuses that are no longer in the buses array
        // This ensures buses disappear immediately when drivers go off duty
        const activeBusIds = new Set(buses.map(b => b.id));
        const busesToKeep = prevMapBuses.filter(bus => {
          // Keep bus if it's in the new active buses list
          if (activeBusIds.has(bus.id)) {
            return true;
          }
          // Remove bus if it's no longer in the context buses (driver went off duty)
          console.log('🚫 Removing bus from MapScreen - no longer in context (driver off duty):', bus.id);
          return false;
        });
        
        const transformedBuses = buses.map(bus => {
          const route = routes.find(r => r.id === bus.route_id);
          
          // Show buses that have active drivers (relaxed criteria for testing)
          const hasActiveDriver = bus.driver_id && bus.status === 'active';
          const hasRecentLocation = bus.last_location_update && 
            new Date(bus.last_location_update) > new Date(Date.now() - 10 * 60 * 1000); // Within last 10 minutes (relaxed)
          const hasValidCoordinates = bus.latitude && bus.longitude && 
            !isNaN(bus.latitude) && !isNaN(bus.longitude);
          
          // Check if driver just went on duty (bus was recently updated - within last 5 minutes)
          // This allows buses to appear immediately when driver goes on duty, even without coordinates yet
          // Extended to 5 minutes to allow more time for GPS to acquire location
          const justWentOnDuty = bus.updated_at && 
            new Date(bus.updated_at) > new Date(Date.now() - 5 * 60 * 1000);
          
          // Show bus if driver is active AND (has valid coordinates OR just went on duty)
          // This allows buses to appear immediately when driver goes on duty, even before first location update
          if (!hasActiveDriver) {
            return null;
          }
          
          // Get coordinates directly from the buses table
          let lat = bus.latitude;
          let lng = bus.longitude;
          
          // CRITICAL FIX: If new data has no coordinates, preserve existing coordinates from previous state
          // This prevents buses from snapping back to user location or placeholder
          if (!hasValidCoordinates) {
            const prevBus = prevMap.get(bus.id);
            if (prevBus && typeof prevBus.latitude === 'number' && typeof prevBus.longitude === 'number') {
              // Keep the previous coordinates - don't overwrite with user location
              lat = prevBus.latitude;
              lng = prevBus.longitude;
            } else if (justWentOnDuty) {
              // Only use placeholder for brand new buses that just went on duty
              // Use a default location instead of user location to avoid confusion
              lat = 14.4791; // Default to a central location
              lng = 120.8969;
            } else {
              // Bus doesn't have coordinates and hasn't just gone on duty - don't show it
              return null;
            }
          }
          
          const transformedBus = {
            id: bus.id, // Use id from the buses table
            route_number: route ? route.route_number : 'Unknown',
            direction: route ? `${route.origin} to ${route.destination}` : 'Unknown',
            latitude: lat,
            longitude: lng,
            status: bus.tracking_status || bus.status || 'active',
            capacity_percentage: bus.capacity_percentage || 0,
            current_passengers: bus.current_passengers || 0,
            max_capacity: bus.max_capacity || 50,
            last_location_update: bus.updated_at || new Date().toISOString(),
          };
          return transformedBus;
        }).filter(b => {
          if (!b) return false; // Filter out null buses (inactive drivers)
          const isValid = typeof b.latitude === 'number' && typeof b.longitude === 'number';
          return isValid;
        });
        
        // Merge: keep existing buses that are still valid, add new ones from context
        const mergedMap = new Map();
        busesToKeep.forEach(bus => mergedMap.set(bus.id, bus));
        transformedBuses.forEach(bus => mergedMap.set(bus.id, bus));
        
        return Array.from(mergedMap.values());
      });
    } catch (error) {
      console.error('Error loading buses:', error);
      setMapBuses([]);
    }
  };

  // Calculate arrival times for buses
  const calculateArrivalTimes = async () => {
    if (!location?.coords || mapBuses.length === 0) return;
    
    try {
      const { supabase } = useSupabase();
      const arrivalPromises = mapBuses.map(async (bus) => {
        const { data, error } = await supabase.rpc('calculate_arrival_times', {
          p_bus_id: bus.id,
          p_passenger_lat: location.coords.latitude,
          p_passenger_lng: location.coords.longitude
        });
        
        if (error) throw error;
        return { busId: bus.id, arrivalData: data };
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

  const getLocation = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorMsg('Location services are disabled. Please enable GPS.');
        setIsLoading(false);
        return;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied.');
        setIsLoading(false);
        return;
      }

      // Get an initial highly accurate fix fast
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        maximumAge: 5000,
      });

      setLocation(currentLocation);
      setIsLoading(false);
    } catch (error) {
      setErrorMsg(`Failed to get your location: ${error.message}`);
      setIsLoading(false);
    }
  };

  const initialRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    // Fallback region (will recenter as soon as we get a fix)
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Google Maps API key now handled by RealtimeBusMap component

  // Location handling now managed by RealtimeBusMap component


  const testDatabase = async () => {
    try {
      const result = await supabaseHelpers.testDatabaseData();
      Alert.alert(
        'Database Test Results',
        `Buses: ${result.data?.buses || 0}\nTracking: ${result.data?.tracking || 0}\nView: ${result.data?.view || 0}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Database Test Failed', error.message);
    }
  };

  const clearSelection = () => {
    setSelectedBusId(null);
  };

  const handleBusPress = (bus) => {
    setTrackingBus(bus);
    setShowTrackModal(true);
  };

  const handleBusSelect = (bus) => {
    const busId = bus?.id || bus?.bus_id;
    if (busId) {
      setSelectedBusId(busId);
    }
  };

  const handleBusesLoaded = (loadedBuses) => {
    setMapBuses(loadedBuses);
  };

  const handleRouteSelect = async (routeId) => {
    setSelectedRouteId(routeId);
    setShowRouteSelector(false);
    
    // Load the selected route details
    try {
      const route = await getRouteById(routeId, supabaseHelpers);
      // route details are stored in state; no extra logging needed
    } catch (err) {
      console.error('Error loading selected route:', err);
    }
  };

  const startTracking = () => {
    if (trackingBus) {
      setSelectedBusId(trackingBus.id);
      setShowTrackModal(false);
      
      // Focus on the tracked bus - now handled by RealtimeBusMap component
    }
  };

  const stopTracking = () => {
    setTrackingBus(null);
    setSelectedBusId(null);
    setShowTrackModal(false);
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="warning" size={40} color="#F44336" />
        <Text style={styles.errorText}>{errorMsg}</Text>
        {errorMsg.includes('quota') || errorMsg.includes('exceeded') ? (
          <Text style={styles.errorSubtext}>
            Google Maps API quota has been exceeded. Please try again later or contact support.
          </Text>
        ) : null}
        <TouchableOpacity style={styles.retryBtn} onPress={getLocation}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fallbackBtn} 
          onPress={() => navigation.navigate('BusList')}
        >
          <Text style={styles.fallbackBtnText}>View Bus List Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Bus Map</Text>
          <Text style={styles.headerSubtitle}>Real-time tracking</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => setShowTest(!showTest)}
          >
            <Ionicons name="bug" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => navigation.getParent()?.openDrawer()}
          >
            <Ionicons name="menu" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {showTest ? (
        <RealtimeTest />
      ) : (
        <RealtimeBusMap
          initialRegion={initialRegion}
          onBusSelect={handleBusSelect}
          selectedBusId={selectedBusId}
          showArrivalTimes={true}
          showCapacityStatus={true}
          userLocation={location?.coords}
          onBusesLoaded={handleBusesLoaded}
          selectedRouteId={selectedRouteId}
          onRouteSelect={handleRouteSelect}
          selectedRoute={selectedRoute}
        />
      )}

      {/* Action buttons */}
      <View style={styles.fabGroup}>
        {/* Route Selector */}
        <TouchableOpacity 
          style={[styles.fab, selectedRouteId && styles.fabActive]} 
          onPress={() => setShowRouteSelector(true)}
        >
          <Ionicons name="map" size={20} color={selectedRouteId ? "#fff" : "#f59e0b"} />
        </TouchableOpacity>

        {/* Refresh Location */}
        <TouchableOpacity style={styles.fab} onPress={getLocation}>
          <Ionicons name="refresh" size={20} color="#f59e0b" />
        </TouchableOpacity>
        
        {/* Set Alarm */}
        <TouchableOpacity style={styles.fab} onPress={() => setShowSetAlarmModal(true)}>
          <Ionicons name="alarm" size={20} color="#3B82F6" />
        </TouchableOpacity>
        
        {/* Clear Selection - only show when bus is selected */}
        {selectedBusId && (
          <TouchableOpacity style={styles.fab} onPress={clearSelection}>
            <Ionicons name="close" size={20} color="#f59e0b" />
          </TouchableOpacity>
        )}

        {/* Route Planner */}
        <TouchableOpacity 
          style={[styles.fab, showRouteInfoPanel && styles.fabActive]} 
          onPress={() => setShowRouteInfoPanel(!showRouteInfoPanel)}
        >
          <Ionicons name="map-outline" size={20} color={showRouteInfoPanel ? "#fff" : "#f59e0b"} />
        </TouchableOpacity>
      </View>

      {/* Route Info Panel */}
      <RouteInfoPanel
        routes={availableRoutes}
        selectedRoute={selectedRoute}
        onRouteSelect={(route) => {
          setSelectedRoute(route);
          setSelectedRouteId(route.id);
          setShowRouteInfoPanel(false);
        }}
        onClose={() => setShowRouteInfoPanel(false)}
        isVisible={showRouteInfoPanel}
      />

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoText}>
            {mapBuses.length} buses • Last update: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={async () => {
            await refreshData();
            // Force reload by navigating away and back (if needed)
            // The RealtimeBusMap component should automatically reload when contextBuses changes
          }}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusLegend}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusText}>Live</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.statusText}>Crowded</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.statusText}>Full</Text>
          </View>
        </View>
        
        {selectedBusId && (
          <View style={styles.selectedBusContainer}>
            <View style={styles.selectedBusInfo}>
              <Ionicons name="radio-button-on" size={18} color="#f59e0b" />
              <Text style={styles.selectedBusText}>
                Bus {mapBuses.find(bus => (bus.id || bus.bus_id) === selectedBusId)?.route_number 
                  || mapBuses.find(bus => (bus.id || bus.bus_id) === selectedBusId)?.route_name 
                  || 'Unknown'} Selected
              </Text>
            </View>
            <View style={styles.busActionButtons}>
              <TouchableOpacity 
                style={styles.pingButton}
                onPress={() => setShowPingModal(true)}
              >
                <Ionicons name="notifications-outline" size={16} color="#007AFF" />
                <Text style={styles.pingButtonText}>Ping</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.stopTrackingButton}
                onPress={stopTracking}
              >
                <Ionicons name="stop" size={14} color="#f59e0b" />
                <Text style={styles.stopTrackingText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Track Bus Modal */}
      {showTrackModal && trackingBus && (
        <View style={styles.modalOverlay}>
          <View style={styles.trackModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Track Bus</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowTrackModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.busInfo}>
              <View style={styles.busIconContainer}>
                <Ionicons name="bus" size={36} color="#f59e0b" />
              </View>
              <View style={styles.busDetails}>
                <Text style={styles.busName}>{trackingBus.route_number}</Text>
                <Text style={styles.busDirection}>{trackingBus.direction}</Text>
                <View style={styles.busStatusRow}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: trackingBus.status === 'active' ? '#4CAF50' : '#FF9800' }
                  ]} />
                  <Text style={styles.busStatus}>{trackingBus.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.trackActions}>
              <TouchableOpacity 
                style={styles.trackButton}
                onPress={startTracking}
              >
                <Ionicons name="locate" size={20} color="#fff" />
                <Text style={styles.trackButtonText}>Start Tracking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowTrackModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Route Selector Modal */}
      {showRouteSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.routeModal}>
            <View style={styles.routeHeader}>
              <Text style={styles.routeTitle}>Select Route</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowRouteSelector(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.routeList}>
              {availableRoutes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.routeItem,
                    selectedRouteId === route.id && styles.routeItemSelected
                  ]}
                  onPress={() => handleRouteSelect(route.id)}
                >
                  <View style={styles.routeInfo}>
                    <Text style={[
                      styles.routeName,
                      selectedRouteId === route.id && styles.routeNameSelected
                    ]}>
                      {route.name}
                    </Text>
                    <Text style={styles.routeDescription}>
                      {route.origin} → {route.destination}
                    </Text>
                    <View style={styles.routeDetails}>
                      <Text style={styles.routeDetail}>
                        <Ionicons name="time" size={14} color="#666" /> {route.estimatedDuration} min
                      </Text>
                      <Text style={styles.routeDetail}>
                        <Ionicons name="cash" size={14} color="#666" /> ₱{route.fare}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.routeColor,
                    { backgroundColor: route.color }
                  ]} />
                </TouchableOpacity>
              ))}
            </View>
            
            {selectedRouteId && (
              <TouchableOpacity
                style={styles.clearRouteButton}
                onPress={() => {
                  setSelectedRouteId(null);
                  setShowRouteSelector(false);
                }}
              >
                <Text style={styles.clearRouteText}>Clear Route Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Set Alarm Modal */}
      <SetAlarmModal
        visible={showSetAlarmModal}
        onClose={() => setShowSetAlarmModal(false)}
        userType="passenger"
        selectedBus={mapBuses.find(bus => (bus.id || bus.bus_id) === selectedBusId) || null}
      />

      {/* Ping Modal */}
      {selectedBusId && (
        <PingModal
          visible={showPingModal}
          onClose={() => setShowPingModal(false)}
          busId={selectedBusId}
          busNumber={mapBuses.find(bus => (bus.id || bus.bus_id) === selectedBusId)?.route_number 
            || mapBuses.find(bus => (bus.id || bus.bus_id) === selectedBusId)?.bus_name}
          routeNumber={mapBuses.find(bus => (bus.id || bus.bus_id) === selectedBusId)?.route_number 
            || mapBuses.find(bus => (bus.id || bus.bus_id) === selectedBusId)?.route_name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  map: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 32,
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerCenter: { 
    flex: 1, 
    alignItems: 'center', 
    marginHorizontal: 10 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.8
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerIconButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 8, color: '#666' },
  errorText: { marginTop: 8, color: '#F44336', textAlign: 'center', paddingHorizontal: 24, fontWeight: '600' },
  errorSubtext: { marginTop: 8, color: '#6B7280', textAlign: 'center', paddingHorizontal: 24, fontSize: 14 },
  retryBtn: { marginTop: 12, backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  fallbackBtn: { marginTop: 8, backgroundColor: '#6B7280', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  fallbackBtnText: { color: '#fff', fontWeight: '600' },

  fabGroup: { position: 'absolute', right: 24, top: 140, zIndex: 1000 },
  fab: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16, 
    shadowColor: '#f59e0b', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 20, 
    elevation: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0'
  },
  fabActive: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b', shadowOpacity: 0.4, borderColor: '#f59e0b' },

  infoCard: { 
    position: 'absolute', 
    left: 24, 
    right: 24, 
    bottom: 32, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 28, 
    padding: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 30, 
    elevation: 16,
    zIndex: 999,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  infoHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  infoText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: -0.2
  },
  refreshButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginLeft: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  statusLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginTop: 8
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  selectedBusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff5e6', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 20, 
    marginTop: 12,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#ffe4b3',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  selectedBusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  selectedBusText: { 
    marginLeft: 8, 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#f59e0b',
    flex: 1,
    letterSpacing: -0.2
  },
  stopTrackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  stopTrackingText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '800',
    color: '#f59e0b',
    letterSpacing: 0.2
  },
  statusItem: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  statusText: { 
    fontSize: 13, 
    color: '#1a1a1a', 
    fontWeight: '700',
    letterSpacing: -0.1
  },
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: 'white',
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B973A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: 'white',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  trackModal: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 28,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    position: 'absolute',
    top: 100,
    left: '5%',
    right: '5%',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f59e0b',
    letterSpacing: -0.5
  },
  closeButton: {
    padding: 4,
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  busIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: '#fff5e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#ffe4b3',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  busDetails: {
    flex: 1,
  },
  busName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.3
  },
  busDirection: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  busStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busStatus: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  trackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8f9fa'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },

  // Route Modal Styles
  routeModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxHeight: '70%',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  routeList: {
    maxHeight: 400,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  routeItemSelected: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  routeNameSelected: {
    color: '#3B82F6',
  },
  routeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  routeDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  routeDetail: {
    fontSize: 12,
    color: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 12,
  },
  clearRouteButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  clearRouteText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  pingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  pingButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  busActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}); 