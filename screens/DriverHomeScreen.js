import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSupabase } from '../contexts/SupabaseContext';
import { useDrawer } from '../contexts/DrawerContext';
import CapacityStatusModal from '../components/CapacityStatusModal';
import NotificationModal from '../components/NotificationModal';
import { supabase } from '../lib/supabase';
import { Vibration } from 'react-native';
import {
  enableDriverBackgroundTracking,
  stopDriverBackgroundTracking,
  setDriverBackgroundDutyStatus,
} from '../background/driverBackgroundTasks';
import { colors, spacing, radius, shadows } from '../styles/uiTheme';

const { width } = Dimensions.get('window');

// Simple UUID generator for React Native
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function DriverHomeScreen({ navigation }) {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [passengerCount, setPassengerCount] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [currentCapacity, setCurrentCapacity] = useState(0);
  const [currentBus, setCurrentBus] = useState(null);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [pingNotifications, setPingNotifications] = useState([]);
  const [showPingModal, setShowPingModal] = useState(false);
  const [unreadPingCount, setUnreadPingCount] = useState(0);
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: null,
    type: 'default',
    icon: null,
  });

  // Get data from Supabase context
  const { 
    supabase,
    buses, 
    routes, 
    drivers, 
    schedules, 
    driverBusAssignments,
    loading, 
    error, 
    refreshData,
    getDriverSchedules,
    getDriverBuses,
    updateDriverStatus,
    startTrip,
    endTrip,
    updatePassengerCount,
    updateBusCapacityStatus,
    getBusCapacityStatus,
    startDriverSession,
    endDriverSession,
    updateBusLocation,
    getBusPingNotifications,
    acknowledgePing,
    completePing
  } = useSupabase();


  // Load current driver information on component mount
  useEffect(() => {
    const loadCurrentDriver = async () => {
      try {
        console.log('🔍 Loading current driver...');
        const driverSession = await AsyncStorage.getItem('driverSession');
        console.log('📱 Driver session from storage:', driverSession ? 'Found' : 'Not found');
        
        if (driverSession) {
          const session = JSON.parse(driverSession);
          console.log('👤 Session data:', session);
          console.log('🔍 Available drivers:', drivers.length);
          
          const driver = drivers.find(d => d.id === session.driver_id);
          if (driver) {
            setCurrentDriver(driver);
            console.log('✅ Current driver loaded:', driver.name, driver.id);
            
            // Find assigned bus for this driver using driver-bus assignments
            console.log('🔍 Loading bus assignment for driver:', driver.id, driver.name);
            console.log('📋 Available assignments:', driverBusAssignments.length);
            if (driverBusAssignments.length > 0) {
              console.log('📋 Sample assignment structure:', JSON.stringify(driverBusAssignments[0], null, 2));
            }
            
            // Try multiple ways to find the assignment
            // Log all assignments for debugging
            console.log('📋 All assignments:', driverBusAssignments.map(a => ({
              id: a.id,
              driver_id: a.driver_id,
              drivers_id: a.drivers?.id,
              bus_id: a.bus_id,
              has_buses: !!a.buses,
              bus_name: a.buses?.name || a.buses?.bus_number
            })));
            
            const assignment = driverBusAssignments.find(assignment => {
              // CRITICAL: Only find active assignments
              if (assignment.is_active !== true) {
                return false;
              }
              
              // Try multiple matching strategies
              const match1 = assignment.drivers?.id === driver.id;
              const match2 = assignment.driver_id === driver.id;
              const match3 = assignment.driver_id?.toString() === driver.id?.toString();
              const match4 = assignment.drivers?.id?.toString() === driver.id?.toString();
              
              const matches = match1 || match2 || match3 || match4;
              
              if (matches) {
                console.log('✅ Found matching assignment:', {
                  assignment_id: assignment.id,
                  driver_id_from_assignment: assignment.driver_id,
                  driver_id_from_joined: assignment.drivers?.id,
                  driver_id_looking_for: driver.id,
                  is_active: assignment.is_active,
                  match1, match2, match3, match4,
                  has_bus_data: !!assignment.buses,
                  bus_id: assignment.bus_id,
                  bus_name: assignment.buses?.name || assignment.buses?.bus_number
                });
              }
              
              return matches;
            });
            
            if (assignment) {
              console.log('✅ Assignment found:', assignment);
              // Use the bus data from the assignment (which includes nested route info)
              if (assignment.buses) {
                setCurrentBus(assignment.buses);
                console.log('✅ Assigned bus found from assignment:', assignment.buses.bus_number || assignment.buses.name, assignment.buses.id);
              } else if (assignment.bus_id) {
                // Fallback: Find bus by bus_id from assignment
                console.log('⚠️ Assignment exists but bus data missing. Looking up bus by bus_id:', assignment.bus_id);
                const foundBus = buses.find(bus => bus.id === assignment.bus_id);
                if (foundBus) {
                  setCurrentBus(foundBus);
                  console.log('✅ Found bus by assignment bus_id:', foundBus.bus_number || foundBus.name);
                } else {
                  console.log('❌ Bus not found in buses array (array is empty or bus not loaded). Querying directly...');
                  // FIX: Query bus directly from database if not in array
                  try {
                    // Use .maybeSingle() which handles 0 or 1 rows gracefully
                    const { data: busData, error: busError } = await supabase
                      .from('buses')
                      .select('*')
                      .eq('id', assignment.bus_id)
                      .maybeSingle();
                    
                    if (!busError && busData) {
                      setCurrentBus(busData);
                      console.log('✅ Found bus via direct query:', busData.bus_number || busData.name);
                    } else {
                      // Either error or no data - try fallback query through assignment join
                      console.log('❌ Bus query failed:', busError?.message || 'No rows returned');
                      
                      // Try alternative: query through assignment join (this should work since assignments load successfully)
                      try {
                        console.log('🔄 Trying fallback query through assignment join...');
                        const { data: altBusData, error: altError } = await supabase
                          .from('driver_bus_assignments')
                          .select(`
                            buses:bus_id(*)
                          `)
                          .eq('id', assignment.id)
                          .maybeSingle();
                        
                        if (!altError && altBusData?.buses) {
                          setCurrentBus(altBusData.buses);
                          console.log('✅ Found bus via assignment join:', altBusData.buses.bus_number || altBusData.buses.name);
                        } else {
                          console.log('❌ Fallback query also failed:', altError?.message);
                        }
                      } catch (altError) {
                        console.error('❌ Alternative query also failed:', altError);
                      }
                    }
                  } catch (queryError) {
                    console.error('❌ Error querying bus:', queryError);
                  }
                }
              } else {
                console.log('❌ Assignment found but no bus_id or bus data');
              }
            } else {
              console.log('❌ No assignment found in loaded data. Trying direct database query...');
              console.log('📋 All assignment driver IDs:', driverBusAssignments.map(a => ({
                assignment_id: a.id,
                driver_id: a.driver_id,
                drivers_id: a.drivers?.id,
                bus_id: a.bus_id
              })));
              
              // Fallback 1: Query database directly for assignment
              try {
                const { data: directAssignment, error: assignmentError } = await supabase
                  .from('driver_bus_assignments')
                  .select(`
                    id,
                    driver_id,
                    bus_id,
                    is_active,
                    buses:bus_id(
                      bus_number,
                      name,
                      route_id,
                      id,
                      status,
                      routes:route_id(id, route_number, name)
                    )
                  `)
                  .eq('driver_id', driver.id)
                  .eq('is_active', true)
                  .order('assigned_at', { ascending: false })
                  .limit(1)
                  .single();
                
                if (!assignmentError && directAssignment) {
                  console.log('✅ Found assignment via direct query:', directAssignment);
                  if (directAssignment.buses) {
                    setCurrentBus(directAssignment.buses);
                    console.log('✅ Assigned bus found via direct query:', directAssignment.buses.bus_number || directAssignment.buses.name);
                  } else if (directAssignment.bus_id) {
                    const foundBus = buses.find(bus => bus.id === directAssignment.bus_id);
                    if (foundBus) {
                      setCurrentBus(foundBus);
                      console.log('✅ Found bus by direct query bus_id:', foundBus.bus_number || foundBus.name);
                    }
                  }
                } else {
                  console.log('⚠️ Direct query also found no assignment:', assignmentError?.message);
                  
                  // Fallback 2: Check buses table directly (in case assignment exists but query didn't return it)
                  const busFromBusesTable = buses.find(bus => bus.driver_id === driver.id);
                  if (busFromBusesTable) {
                    setCurrentBus(busFromBusesTable);
                    console.log('✅ Assigned bus found from buses table:', busFromBusesTable.bus_number || busFromBusesTable.name);
                  } else {
                    console.log('❌ No bus assignment found for driver:', driver.id);
                    console.log('📋 Available buses with drivers:', buses.filter(b => b.driver_id).map(b => ({ 
                      id: b.id, 
                      name: b.name, 
                      bus_number: b.bus_number,
                      driver_id: b.driver_id 
                    })));
                  }
                }
              } catch (queryError) {
                console.error('❌ Error querying assignment directly:', queryError);
              }
            }
          } else {
            console.log('❌ Driver not found in drivers list. Looking for:', session.driver_id);
            console.log('Available driver IDs:', drivers.map(d => d.id));
          }
        } else {
          console.log('❌ No driver session found');
        }
      } catch (error) {
        console.error('❌ Error loading current driver:', error);
      }
    };

    // Load when we have drivers - assignments might be empty but we can still check buses table
    if (drivers.length > 0) {
      loadCurrentDriver();
    } else {
      console.log('⚠️ Waiting for drivers to load...');
    }
  }, [drivers, buses, driverBusAssignments, routes]);

  useEffect(() => {
    const hydrateDutyStateFromSession = async () => {
      try {
        const driverSessionRaw = await AsyncStorage.getItem('driverSession');
        if (!driverSessionRaw) {
          return;
        }

        // Only restore duty state if there's an active trip stored
        // Drivers should start as "off duty" by default when logging in
        const storedTrip = await AsyncStorage.getItem('currentTrip');
        if (storedTrip) {
          try {
            const trip = JSON.parse(storedTrip);
            // Only restore if trip data is valid and has required fields
            if (trip && trip.busId && trip.startTime) {
              setCurrentTrip(trip);
              setIsOnDuty(true);
              
              // Only set background duty status if there's an active trip
              if (currentBus?.id) {
                await setDriverBackgroundDutyStatus('on_trip');
              }
            } else {
              // Invalid trip data - clear it and stay off duty
              await AsyncStorage.removeItem('currentTrip');
              setIsOnDuty(false);
            }
          } catch (parseError) {
            // Invalid trip data - clear it
            await AsyncStorage.removeItem('currentTrip');
            setIsOnDuty(false);
          }
        } else {
          // No stored trip - driver should be off duty
          setIsOnDuty(false);
        }
      } catch (hydrateError) {
        console.warn('⚠️ Failed to hydrate driver duty state:', hydrateError?.message || hydrateError);
        // On error, default to off duty
        setIsOnDuty(false);
      }
    };

    hydrateDutyStateFromSession();
  }, [currentBus?.id]);

  // Sync currentCapacity with currentBus.capacity_percentage when currentBus changes
  useEffect(() => {
    if (currentBus?.capacity_percentage !== undefined && currentBus?.capacity_percentage !== null) {
      setCurrentCapacity(currentBus.capacity_percentage);
    }
  }, [currentBus?.capacity_percentage]);

  // Location watcher ref and helpers
  const locationWatchRef = useRef(null);

  const stopLocationUpdates = async () => {
    try {
      if (locationWatchRef.current && locationWatchRef.current.remove) {
        await locationWatchRef.current.remove();
      }
    } catch (_) {}
    locationWatchRef.current = null;
  };

  const startLocationUpdates = async (busId) => {
    try {
      console.log('🚀 Starting location updates for bus:', busId);
      
      // Ensure services enabled
      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        console.log('❌ Location services not enabled');
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission not granted');
        return;
      }

      console.log('✅ Location services ready, starting watcher...');

      // Start high accuracy watcher
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,    // Update every 1 second (was 2000)
          distanceInterval: 1,   // Update on 1 meter change (was 2)
          mayShowUserSettingsDialog: true,
        },
        async (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords || {};
          console.log('📍 Location update received:', { latitude, longitude, accuracy, speed });
          
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            console.log('⚠️ Invalid coordinates, skipping update');
            return;
          }
          
          try {
            console.log('📤 Sending location update to server...');
            const result = await updateBusLocation({
              busId,
              latitude,
              longitude,
              accuracy: typeof accuracy === 'number' ? accuracy : 10,
              speed: typeof speed === 'number' ? (speed * 3.6) : null, // m/s -> km/h
            });
            
            console.log('✅ Location update result:', result);
            setCurrentLocation({ latitude, longitude });
          } catch (e) {
            // Log and continue without interrupting the watcher
            console.error('❌ Bus location update failed:', e?.message || e);
          }
        }
      );
      
      console.log('✅ Location watcher started successfully');
    } catch (e) {
      console.error('❌ Failed to start location updates:', e?.message || e);
    }
  };

  // Start/stop location updates based on duty status and assigned bus
  useEffect(() => {
    console.log('🔄 Duty status changed:', { isOnDuty, currentBus: currentBus?.id });
    
    if (isOnDuty && currentBus?.id) {
      console.log('✅ Starting location updates for bus:', currentBus.id);
      startLocationUpdates(currentBus.id);
    } else {
      console.log('🛑 Stopping location updates');
      stopLocationUpdates();
    }
    return () => { stopLocationUpdates(); };
  }, [isOnDuty, currentBus?.id]);

  // Mirror duty state into the resilient background task so Android runs a
  // foreground service with the persistent notification even if the app moves
  // to the background or the screen turns off.
  useEffect(() => {
    let cancelled = false;

    const syncBackgroundTask = async () => {
      try {
        if (isOnDuty && currentBus?.id) {
          console.log('🚚 Ensuring background tracking stays active for bus:', currentBus?.id);
          const result = await enableDriverBackgroundTracking({ 
            busId: currentBus.id, 
            dutyStatus: 'on_trip' 
          });
          
          if (!cancelled) {
            if (result?.success) {
              console.log('✅ Background tracking enabled successfully');
              await setDriverBackgroundDutyStatus('on_trip');
            } else {
              const errorMsg = result?.error || 'Unknown error';
              console.error('❌ Failed to enable background tracking:', errorMsg);
              // Show alert to user so they know tracking might not work in background
              Alert.alert(
                'Background Tracking Issue',
                `Location tracking may not work when the app is minimized: ${errorMsg}. Please check app permissions in Settings.`,
                [{ text: 'OK' }]
              );
            }
          }
        } else {
          console.log('🛑 Ensuring background tracking stops while off duty or missing bus assignment.');
          await setDriverBackgroundDutyStatus('off_duty');
          await stopDriverBackgroundTracking();
        }
      } catch (bgSyncError) {
        console.error('❌ Failed to sync driver background tracking state:', bgSyncError?.message || bgSyncError);
        if (!cancelled) {
          Alert.alert(
            'Background Tracking Error',
            'Failed to start background location tracking. Location updates may stop when the app is minimized.',
            [{ text: 'OK' }]
          );
        }
      }
    };

    // Small delay to ensure state is stable
    const timeoutId = setTimeout(() => {
      syncBackgroundTask();
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isOnDuty, currentBus?.id]);

  // Load and subscribe to ping notifications
  useEffect(() => {
    if (!currentBus?.id) return;

    // Initial load
    loadPingNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`ping-notifications-${currentBus.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: `ping-${currentBus.id}` }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ping_notifications',
          filter: `bus_id=eq.${currentBus.id}`
        },
        (payload) => {
          console.log('🔔 Ping notification change:', payload);
          
          // Check event type - Supabase uses 'event' property, not 'eventType'
          const eventType = payload.eventType || payload.event;
          console.log('🔔 Event type:', eventType, 'Full payload:', JSON.stringify(payload, null, 2));
          
          // Reload notifications for any change (INSERT, UPDATE, DELETE)
          loadPingNotifications();
          
          // Vibrate and alert on new ping
          if (eventType === 'INSERT' || eventType === 'insert') {
            Vibration.vibrate([0, 200, 100, 200]);
            setNotificationModal({
              visible: true,
              title: 'New Passenger Ping!',
              message: 'A passenger has sent you a notification',
              buttons: [
                { 
                  text: 'View', 
                  onPress: () => {
                    setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null });
                    setShowPingModal(true);
                  }
                },
                {
                  text: 'Later', 
                  style: 'cancel',
                  onPress: () => setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null })
                }
              ],
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Ping subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to ping notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Ping subscription error - check if real-time is enabled for ping_notifications table');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Ping subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Ping subscription closed');
        }
      });

    return () => {
      console.log('🔄 Cleaning up ping notification subscription');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentBus?.id]);

  const loadPingNotifications = async () => {
    if (!currentBus?.id) return;

    try {
      const result = await getBusPingNotifications(currentBus.id);
      if (result.success && result.data) {
        setPingNotifications(result.data);
        const unreadCount = result.data.filter(p => p.status === 'pending').length;
        setUnreadPingCount(unreadCount);
      }
    } catch (error) {
      console.error('Error loading ping notifications:', error);
    }
  };

  const handleAcknowledgePing = async (pingId) => {
    try {
      const result = await acknowledgePing(pingId);
      if (result.success) {
        await loadPingNotifications();
        setNotificationModal({
          visible: true,
          title: 'Success',
          message: 'Ping acknowledged!',
          buttons: null,
        });
      } else {
        setNotificationModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to acknowledge ping',
          buttons: null,
        });
      }
    } catch (error) {
      console.error('Error acknowledging ping:', error);
      setNotificationModal({
        visible: true,
        title: 'Error',
        message: 'Failed to acknowledge ping',
        buttons: null,
      });
    }
  };

  const handleCompletePing = async (pingId) => {
    try {
      const result = await completePing(pingId);
      if (result.success) {
        await loadPingNotifications();
        setNotificationModal({
          visible: true,
          title: 'Success',
          message: 'Ping completed!',
          buttons: null,
        });
      } else {
        setNotificationModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to complete ping',
          buttons: null,
        });
      }
    } catch (error) {
      console.error('Error completing ping:', error);
      setNotificationModal({
        visible: true,
        title: 'Error',
        message: 'Failed to complete ping',
        buttons: null,
      });
    }
  };

  const handleViewLocation = (latitude, longitude, address, userName, pingId) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Invalid location coordinates');
      return;
    }

    // Navigate directly to map view
    navigation.navigate('DriverMap', {
      pingLocation: {
        latitude: lat,
        longitude: lng,
        address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        userName: userName || 'Passenger',
        pingId: pingId,
      },
    });
  };

  // Calculate driver stats from real data
  const calculateDriverStats = () => {
    if (!currentDriver) return [];
    
    const today = new Date().toDateString();
    const todaySchedules = schedules.filter(schedule => 
      schedule.bus_id === currentBus?.id && 
      new Date(schedule.departure_time).toDateString() === today
    );
    
    const driverBuses = buses.filter(bus => bus.driver_id === currentDriver.id);
    const activeBuses = driverBuses.filter(bus => bus.status === 'active');
    const totalPassengers = activeBuses.reduce((sum, bus) => sum + (bus.current_passengers || 0), 0);
    const totalDistance = activeBuses.reduce((sum, bus) => sum + (bus.distance_traveled || 0), 0);
    
    return [
      {
        title: 'Today\'s Trips',
        value: todaySchedules.length.toString(),
        icon: 'car',
        color: '#4CAF50',
      },
      {
        title: 'Passengers',
        value: totalPassengers.toString(),
        icon: 'account-group',
        color: '#2196F3',
      },
      {
        title: 'Distance',
        value: `${totalDistance.toFixed(1)} km`,
        icon: 'speedometer',
        color: '#FF9800',
      },
      {
        title: 'Active Buses',
        value: activeBuses.length.toString(),
        icon: 'bus',
        color: '#F44336',
      },
    ];
  };

  // Generate recent trips from schedules
  const generateRecentTrips = () => {
    const recentSchedules = schedules
      .filter(schedule => schedule.status === 'completed')
      .slice(0, 3)
      .map(schedule => {
        const route = routes.find(r => r.id === schedule.route_id);
        return {
          id: schedule.id,
          route: route ? `Route ${route.route_number}` : `Route ${schedule.route_id}`,
          startTime: new Date(schedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(schedule.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          passengers: schedule.passengers_count || 0,
          status: schedule.status,
        };
      });
    
    return recentSchedules;
  };

  const driverStats = calculateDriverStats();
  const recentTrips = generateRecentTrips();

  const quickActions = [
    {
      title: 'Start Trip',
      icon: 'play-circle',
      color: '#4CAF50',
      action: 'startTrip',
    },
    {
      title: 'End Trip',
      icon: 'stop-circle',
      color: '#F44336',
      action: 'endTrip',
    },
    {
      title: 'Capacity',
      icon: 'speedometer',
      color: '#00BCD4',
      action: 'capacity',
    },
    {
      title: 'Profile',
      icon: 'person',
      color: '#9C27B0',
      action: 'profile',
    },
  ];

  const handleQuickAction = async (action) => {
    // Use the current driver from state
    if (!currentDriver) {
      Alert.alert('Error', 'Bus conductor not found. Please log in again.');
      return;
    }
    
    // Use the current bus from state
    if (!currentBus) {
      setNotificationModal({
        visible: true,
        title: 'No Bus Assigned',
        message: 'No bus is currently assigned to you.',
        buttons: null,
        type: 'warning',
        icon: 'warning',
      });
      return;
    }

    switch (action) {
      case 'startTrip':
        if (isOnDuty) {
          setNotificationModal({
            visible: true,
            title: 'Already on duty',
            message: 'You are already on an active trip.',
            buttons: null,
            type: 'info',
            icon: 'information-circle',
          });
        } else {
          try {
            const now = new Date();

            // Use a default route ID if currentBus.route_id is null/undefined
            const routeId = currentBus.route_id || routes[0]?.id;
            if (!routeId) {
              Alert.alert('Error', 'No route available for this bus. Please contact support.');
              return;
            }

            // Start trip in backend (RPC first, with legacy fallback)
            const tripResult = await startTrip(currentDriver.id, currentBus.id, routeId);

            // Update driver status (best‑effort; do not fail trip if this throws)
            try {
              await updateDriverStatus(currentDriver.id, 'active');
            } catch (statusError) {
              console.warn('⚠️ Failed to update driver status on trip start:', statusError?.message || statusError);
            }

            // Create driver session in database (used for admin/analytics)
            let driverSession = null;
            try {
              driverSession = await startDriverSession(currentDriver.id, currentBus.id);
              await AsyncStorage.setItem('driverSession', JSON.stringify(driverSession));
            } catch (sessionError) {
              console.warn('⚠️ Failed to start driver session on trip start:', sessionError?.message || sessionError);
            }

            const resolvedRoute = routes.find(r => r.id === (currentBus.route_id || routeId));
            const tripData = {
              route: `Route ${resolvedRoute?.route_number || 'Unknown'}`,
              startTime: now.toLocaleTimeString(),
              passengers: 0,
              busId: currentBus.id,
              // tripResult may be a schedule row or a minimal RPC payload
              scheduleId: tripResult?.id || schedules.find(s => s.bus_id === currentBus.id && s.is_active)?.id || null,
            };

            setIsOnDuty(true);
            setTripStartTime(now);
            setCurrentTrip(tripData);

            // Store trip data in AsyncStorage for other screens to access
            await AsyncStorage.setItem('currentTrip', JSON.stringify(tripData));

            // Start resilient background location tracking so that bus position
            // continues to update even if the driver locks the phone or the app
            // goes to the background. Foreground tracking still runs as before.
            try {
              await enableDriverBackgroundTracking({ busId: currentBus.id, dutyStatus: 'on_trip' });
              await setDriverBackgroundDutyStatus('on_trip');
            } catch (bgError) {
              console.warn('⚠️ Failed to start driver background tracking:', bgError?.message || bgError);
            }
            
            setNotificationModal({
              visible: true,
              title: 'Trip Started',
              message: 'Your trip has been started successfully.',
              buttons: null,
              type: 'success',
              icon: 'checkmark-circle',
            });
          } catch (error) {
            console.error('Error starting trip:', error);
            // Roll back to a safe "off duty" state if anything failed
            setIsOnDuty(false);
            setCurrentTrip(null);
            setTripStartTime(null);
            setPassengerCount(0);

            const message = error?.message || 'Failed to start trip. Please try again.';
            Alert.alert('Error', message);
          }
        }
        break;
      case 'endTrip':
        if (!isOnDuty || !currentTrip) {
          setNotificationModal({
            visible: true,
            title: 'No active trip',
            message: 'You are not currently on an active trip.',
            buttons: null,
            type: 'info',
            icon: 'information-circle',
          });
        } else {
          try {
            // Validate we have a busId (required for ending trip)
            if (!currentTrip.busId && !currentBus?.id) {
              Alert.alert('Error', 'Bus ID is missing. Cannot end trip.');
              return;
            }

            const busId = currentTrip.busId || currentBus?.id;

            // Optimistically update UI state first (same as Go Off Duty)
            setIsOnDuty(false);
            setCurrentTrip(null);
            setPassengerCount(0);
            setTripStartTime(null);
            setCurrentLocation(null);

            // Stop location updates (non-fatal if this fails)
            try { 
              await stopLocationUpdates(); 
            } catch (e) { 
              console.warn('stopLocationUpdates failed:', e?.message || e); 
            }

            // Stop background tracking (non-fatal if this fails)
            try {
              await setDriverBackgroundDutyStatus('off_duty');
              await stopDriverBackgroundTracking();
            } catch (e) { 
              console.warn('stopDriverBackgroundTracking failed:', e?.message || e); 
            }

            // Update bus status directly (same approach as Go Off Duty)
            // This is the critical operation - do it first and handle errors gracefully
            if (supabase && busId) {
              try {
                await supabase
                  .from('buses')
                  .update({
                    status: 'inactive',
                    tracking_status: 'stopped',
                    driver_id: null,
                    updated_at: new Date().toISOString(),
                    last_location_update: new Date().toISOString(),
                  })
                  .eq('id', busId);
                console.log('✅ Bus status updated successfully');
              } catch (busError) {
                console.warn('⚠️ Direct bus update failed (non-fatal):', busError?.message || busError);
              }
            }

            // Try to update schedule if scheduleId exists (non-fatal)
            if (currentTrip.scheduleId) {
              try {
                await endTrip(currentTrip.scheduleId, { busId });
              } catch (scheduleError) {
                console.warn('⚠️ Schedule update failed (non-fatal):', scheduleError?.message || scheduleError);
              }
            }

            // Update driver status (best-effort, don't fail if this errors)
            if (currentDriver?.id) {
              try {
                await updateDriverStatus(currentDriver.id, 'inactive');
              } catch (statusError) {
                console.warn('⚠️ Failed to update driver status (non-fatal):', statusError?.message || statusError);
              }
            }
            
            // End driver session in database if present (best-effort, don't fail if this errors)
            // NOTE: Do NOT remove driverSession from AsyncStorage here - that would log the driver out
            // The driverSession should only be removed when the driver actually logs out
            try {
              const sessionData = await AsyncStorage.getItem('driverSession');
              if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session?.id) {
                  try {
                    await endDriverSession(session.id);
                  } catch (e) {
                    console.warn('endDriverSession failed:', e?.message || e);
                  }
                }
              }
            } catch (sessionError) {
              console.warn('⚠️ Failed to end driver session (non-fatal):', sessionError?.message || sessionError);
            }
            
            // Clear trip data (non-blocking) - but keep driverSession so driver stays logged in
            try {
              await AsyncStorage.removeItem('currentTrip');
            } catch (e) {
              console.warn('removeItem(currentTrip) failed:', e?.message || e);
            }
            
            setNotificationModal({
              visible: true,
              title: 'Trip Ended',
              message: 'Your trip has been ended successfully.',
              buttons: null,
              type: 'success',
              icon: 'checkmark-circle',
            });
          } catch (error) {
            console.error('❌ Unexpected error ending trip:', error);
            // Even if there's an error, the UI is already updated, so show success
            setNotificationModal({
              visible: true,
              title: 'Trip Ended',
              message: 'Your trip has been ended. Some cleanup operations may have failed, but you are now off duty.',
              buttons: null,
              type: 'success',
              icon: 'checkmark-circle',
            });
          }
        }
        break;
      case 'capacity':
        if (!isOnDuty) {
          setNotificationModal({
            visible: true,
            title: 'Off Duty',
            message: 'You must be on duty to update bus capacity. Please start a trip first.',
            buttons: null,
            type: 'warning',
            icon: 'warning',
          });
        } else if (!currentBus) {
          setNotificationModal({
            visible: true,
            title: 'No Bus Assigned',
            message: 'No bus is currently assigned to you.',
            buttons: null,
            type: 'warning',
            icon: 'warning',
          });
        } else {
          // Ensure currentCapacity is synced with currentBus before opening modal
          setCurrentCapacity(currentBus.capacity_percentage || 0);
          setShowCapacityModal(true);
        }
        break;
      case 'profile':
        navigation.navigate('DriverProfile');
        break;
    }
  };

  const handleCapacityUpdate = async (busId, capacityPercentage, pwdPassengers = 0) => {
    // Validate driver is on duty
    if (!isOnDuty) {
      throw new Error('You must be on duty to update bus capacity. Please start a trip first.');
    }
    
    // Validate inputs
    if (!busId) {
      throw new Error('Bus ID is required. Please ensure you are assigned to a bus.');
    }
    
    if (capacityPercentage < 0 || capacityPercentage > 100) {
      throw new Error('Capacity percentage must be between 0 and 100');
    }

    try {
      console.log('🔄 Updating capacity (direct) for bus:', busId, 'to', capacityPercentage + '%', 'PWD:', pwdPassengers);

      // Compute derived values locally
      const maxCapacity =
        currentBus?.max_capacity ||
        currentBus?.capacity ||
        50;
      const currentPassengers = Math.round((capacityPercentage / 100) * maxCapacity);
      const pwdSeats = currentBus?.pwd_seats || 4;
      const safePwdPassengers = Math.max(0, pwdPassengers || 0);
      const pwdSeatsAvailable = Math.max(0, pwdSeats - safePwdPassengers);

      // Perform a direct update on the buses table
      const { data, error } = await supabase
        .from('buses')
        .update({
          capacity_percentage: capacityPercentage,
          current_passengers: currentPassengers,
          current_pwd_passengers: safePwdPassengers,
          pwd_seats_available: pwdSeatsAvailable,
          pwd_seats: pwdSeats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', busId)
        .select('id, capacity_percentage, current_passengers, current_pwd_passengers, pwd_seats_available, pwd_seats, capacity')
        .single();

      if (error) {
        console.error('❌ Direct capacity update failed:', error);
        throw new Error(error.message || 'Failed to update bus capacity. Please try again.');
      }

      console.log('✅ Direct capacity update success:', data);

      // Update local state for UI
      setCurrentCapacity(capacityPercentage);

      const updatedBus = buses.find((bus) => bus.id === busId);
      if (updatedBus) {
        updatedBus.capacity_percentage = capacityPercentage;
        updatedBus.current_passengers = currentPassengers;
        updatedBus.current_pwd_passengers = safePwdPassengers;
        updatedBus.pwd_seats_available = pwdSeatsAvailable;
      }

      if (currentBus && currentBus.id === busId) {
        setCurrentBus({
          ...currentBus,
          capacity_percentage: capacityPercentage,
          current_passengers: currentPassengers,
          current_pwd_passengers: safePwdPassengers,
          pwd_seats_available: pwdSeatsAvailable,
        });
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating capacity:', error);
      const errorMessage = error?.message || 'Failed to update bus capacity. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('DriverProfile');
  };



  const handleOffDuty = async () => {
    if (!isOnDuty) {
      setNotificationModal({
        visible: true,
        title: 'Already Off Duty',
        message: 'You are already off duty.',
        buttons: null,
        type: 'info',
        icon: 'information-circle',
      });
      return;
    }

    setNotificationModal({
      visible: true,
      title: 'Go Off Duty',
      message: 'Are you sure you want to go off duty? This will stop location tracking.',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null }),
        },
        {
          text: 'Go Off Duty',
          onPress: async () => {
            setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null });
            try {
              // Optimistically update UI state so user isn't blocked by cleanup errors
              setIsOnDuty(false);
              setCurrentTrip(null);
              setPassengerCount(0);
              setTripStartTime(null);
              setCurrentLocation(null);

              // Stop location updates (non-fatal if this fails)
              try { await stopLocationUpdates(); } catch (e) { console.warn('stopLocationUpdates failed:', e?.message || e); }

              // Also stop background tracking so we don't keep sending updates
              // after the driver has explicitly gone off duty.
              try {
                await setDriverBackgroundDutyStatus('off_duty');
                await stopDriverBackgroundTracking();
              } catch (e) { console.warn('stopDriverBackgroundTracking failed:', e?.message || e); }

              // Clear current location from bus (accept and continue on error)
              if (currentBus?.id) {
                try {
                  await updateBusLocation({
                    busId: currentBus.id,
                    latitude: null,
                    longitude: null,
                    accuracy: null,
                    speed: null,
                  });
                } catch (e) {
                  console.warn('Clearing bus location failed:', e?.message || e);
                }
              }

              // End driver session in database if present (continue on error)
              // NOTE: Do NOT remove driverSession from AsyncStorage here - that would log the driver out
              // The driverSession should only be removed when the driver actually logs out
              try {
                const sessionData = await AsyncStorage.getItem('driverSession');
                if (sessionData) {
                  const session = JSON.parse(sessionData);
                  if (session?.id) {
                    try { await endDriverSession(session.id); } catch (e) { console.warn('endDriverSession failed:', e?.message || e); }
                  }
                }
              } catch (e) {
                console.warn('Reading driverSession failed:', e?.message || e);
              }

              // DO NOT remove driverSession from AsyncStorage - driver should stay logged in
              // Only clear the currentTrip since the driver is going off duty
              try { await AsyncStorage.removeItem('currentTrip'); } catch (e) { console.warn('removeItem(currentTrip) failed:', e?.message || e); }

              // Update driver status (continue even if this fails due to RLS/columns)
              let driverStatusUpdated = false;
              if (currentDriver?.id) {
                try { 
                  const result = await updateDriverStatus(currentDriver.id, 'inactive');
                  if (result && result.length > 0) {
                    driverStatusUpdated = true;
                    console.log('✅ Driver status updated to inactive:', currentDriver.id);
                  } else {
                    console.warn('⚠️ Driver status update returned no data:', currentDriver.id);
                  }
                } catch (e) { 
                  console.error('❌ updateDriverStatus failed:', e?.message || e);
                  // Show error to user so they know it failed
                  setNotificationModal({
                    visible: true,
                    title: 'Warning',
                    message: `Driver status update failed: ${e?.message || 'Unknown error'}. The bus may still appear on the map.`,
                    buttons: null,
                  });
                }
              }

              // Hard enforce bus offline in DB so status can't stay 'active'
              let busStatusUpdated = false;
              if (supabase && currentBus?.id) {
                try {
                  const { data, error } = await supabase
                    .from('buses')
                    .update({
                      status: 'inactive',
                      tracking_status: 'stopped',
                      driver_id: null,
                      updated_at: new Date().toISOString(),
                      last_location_update: new Date().toISOString(),
                    })
                    .eq('id', currentBus.id)
                    .select();
                  
                  if (error) {
                    console.error('❌ Bus status update error:', error);
                    setNotificationModal({
                      visible: true,
                      title: 'Warning',
                      message: `Bus status update failed: ${error.message}. The bus may still appear on the map.`,
                      buttons: null,
                    });
                  } else if (data && data.length > 0) {
                    busStatusUpdated = true;
                    console.log('✅ Bus status updated to inactive:', currentBus.id, data[0]);
                  } else {
                    console.warn('⚠️ Bus status update returned no data. Bus may not exist or RLS blocked update:', currentBus.id);
                    setNotificationModal({
                      visible: true,
                      title: 'Warning',
                      message: 'Bus status update may have failed. Please check the database manually.',
                      buttons: null,
                    });
                  }
                } catch (e) {
                  console.error('❌ force bus offline failed:', e?.message || e);
                  setNotificationModal({
                    visible: true,
                    title: 'Error',
                    message: `Failed to update bus status: ${e?.message || 'Unknown error'}. Please check the database.`,
                    buttons: null,
                  });
                }
              }
              
              // Log final status for debugging
              console.log('📊 Off-duty update summary:', {
                driverStatusUpdated,
                busStatusUpdated,
                driverId: currentDriver?.id,
                busId: currentBus?.id
              });

              setNotificationModal({
                visible: true,
                title: 'Off Duty',
                message: 'You are now off duty. Location tracking has stopped.',
                buttons: null,
              });
            } catch (error) {
              console.error('Error going off duty:', error);
              setNotificationModal({
                visible: true,
                title: 'Error',
                message: 'Failed to go off duty. Please try again.',
                buttons: null,
              });
            }
          },
        },
      ],
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading bus conductor data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load bus conductor data</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={async () => {
            try {
              await refreshData();
            } catch (error) {
              console.error('Error refreshing data:', error);
            }
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerInner}>
          <View style={styles.headerRow}>
            <View style={styles.placeholder} />

            <View style={[
              styles.headerStatusPill,
              isOnDuty ? styles.headerStatusPillOn : styles.headerStatusPillOff
            ]}>
              <View style={[
                styles.headerStatusIconContainer,
                isOnDuty ? styles.headerStatusIconContainerOn : styles.headerStatusIconContainerOff
              ]}>
                <Ionicons
                  name={isOnDuty ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={isOnDuty ? '#10B981' : '#EF4444'}
                />
              </View>
              <View style={styles.headerStatusContent}>
                <View style={styles.headerStatusRow}>
                  <Text style={[
                    styles.headerStatusTitle,
                    isOnDuty ? styles.headerStatusTitleOn : styles.headerStatusTitleOff
                  ]}>
                    {isOnDuty ? 'On Duty' : 'Off Duty'}
                  </Text>
                  <View style={[
                    styles.headerStatusDot,
                    isOnDuty ? styles.headerStatusDotOn : styles.headerStatusDotOff,
                  ]} />
                </View>
                <Text style={styles.headerStatusSubtitle} numberOfLines={1}>
                  {currentBus
                    ? `Bus ${currentBus.bus_number || currentBus.name || ''}`.trim()
                    : 'No bus assigned'}
                </Text>
              </View>
            </View>

            <View style={styles.headerRightButtons}>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => setShowPingModal(true)}
              >
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadPingCount > 0 && (
                  <View style={styles.pingBadge}>
                    <Text style={styles.pingBadgeText}>{unreadPingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconButton} onPress={handleProfilePress}>
                <Ionicons name="person-circle-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statusCardWrapper}>
        <StatusCard
          isOnDuty={isOnDuty}
          onOffDutyPress={handleOffDuty}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Trip - Prominent Card */}
        {currentTrip && (
          <ActiveTripCard
            route={currentTrip.route}
            passengerCount={passengerCount}
            tripStartTime={tripStartTime}
            currentCapacity={currentCapacity}
          />
        )}

        {/* Stats Overview - Horizontal Cards */}
        <View style={styles.statsOverview}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.overviewGrid}>
            {driverStats.map((stat, index) => (
              <OverviewCard
                key={stat.title + index}
                icon={stat.icon}
                color={stat.color}
                value={stat.value}
                title={stat.title}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions - Essential Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => {
              const isCapacityAction = action.action === 'capacity';
              const isDisabled = isCapacityAction && !isOnDuty;
              
              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    isDisabled && styles.quickActionCardDisabled,
                    pressed && !isDisabled && styles.cardPressed,
                  ]}
                  onPress={() => !isDisabled && handleQuickAction(action.action)}
                  disabled={isDisabled}
                >
                  <View style={[
                    styles.quickActionIcon, 
                    { backgroundColor: isDisabled ? '#E5E7EB' : action.color + '15' }
                  ]}>
                    <Ionicons 
                      name={action.icon} 
                      size={24} 
                      color={isDisabled ? '#9CA3AF' : action.color} 
                    />
                  </View>
                  <Text style={[
                    styles.quickActionTitle,
                    isDisabled && styles.quickActionTitleDisabled
                  ]}>
                    {action.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recent Trips - Compact List */}
        {recentTrips.length > 0 && (
          <View style={styles.recentTripsSection}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <View style={styles.tripsListCompact}>
              {recentTrips.map((trip) => (
                <View key={trip.id} style={styles.tripCardCompact}>
                    <View style={styles.tripCardLeft}>
                    <View style={styles.tripIconSmall}>
                      <Ionicons name="bus" size={16} color={colors.brand} />
                    </View>
                    <View style={styles.tripInfoCompact}>
                      <Text style={styles.tripRouteCompact}>{trip.route}</Text>
                      <Text style={styles.tripTimeCompact}>{trip.startTime} - {trip.endTime}</Text>
                    </View>
                  </View>
                  <View style={styles.tripCardRight}>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.statusBadgeTextSmall}>{trip.status}</Text>
                    </View>
                    <Text style={styles.tripPassengersCompact}>{trip.passengers} passengers</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Capacity Status Modal */}
      <CapacityStatusModal
        visible={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        currentCapacity={currentCapacity}
        onUpdateCapacity={handleCapacityUpdate}
        busId={currentBus?.id}
        busInfo={currentBus}
      />

      {/* Notification Modal */}
      <NotificationModal
        visible={notificationModal.visible}
        title={notificationModal.title}
        message={notificationModal.message}
        buttons={notificationModal.buttons}
        type={notificationModal.type}
        icon={notificationModal.icon}
        onPress={() => setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null })}
      />

      {/* Ping Notifications Modal */}
      <Modal
        visible={showPingModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        statusBarTranslucent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPingModal(false)}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Passenger Pings</Text>
            <TouchableOpacity onPress={loadPingNotifications}>
              <Ionicons name="refresh" size={24} color={colors.brand} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={pingNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={true}
            bounces={true}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            scrollEventThrottle={16}
            ListEmptyComponent={() => (
              <View style={styles.emptyPingContainer}>
                <Ionicons name="notifications-off" size={64} color="#D1D5DB" />
                <Text style={styles.emptyPingText}>No ping notifications</Text>
                <Text style={styles.emptyPingSubtext}>Passengers will appear here when they ping you</Text>
              </View>
            )}
            renderItem={({ item: ping }) => (
                <View style={styles.pingCard}>
                  <View style={styles.pingHeader}>
                    <View style={styles.pingUserInfo}>
                      <Ionicons name="person-circle" size={40} color={colors.brand} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.pingUserName}>
                          {ping.user_name || 'Passenger'}
                        </Text>
                        <Text style={styles.pingTime}>
                          {new Date(ping.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.pingStatusBadge,
                      { backgroundColor: 
                        ping.status === 'pending' ? '#FEF3C7' :
                        ping.status === 'acknowledged' ? '#DBEAFE' :
                        '#D1FAE5'
                      }
                    ]}>
                      <Text style={[
                        styles.pingStatusText,
                        { color:
                          ping.status === 'pending' ? '#92400E' :
                          ping.status === 'acknowledged' ? '#1E40AF' :
                          '#065F46'
                        }
                      ]}>
                        {ping.status === 'pending' ? 'NEW' :
                         ping.status === 'acknowledged' ? 'SEEN' :
                         'DONE'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pingBody}>
                    <View style={styles.pingTypeRow}>
                      <Ionicons 
                        name="bus"
                        size={16} 
                        color="#6B7280" 
                      />
                      <Text style={styles.pingType}>
                        Ride Request
                      </Text>
                    </View>

                    {ping.message && (
                      <Text style={styles.pingMessage}>{ping.message}</Text>
                    )}

                    {ping.location_latitude && ping.location_longitude && (
                      <TouchableOpacity 
                        style={styles.pingLocation}
                        onPress={() => handleViewLocation(
                          ping.location_latitude,
                          ping.location_longitude,
                          ping.location_address,
                          ping.user_name || 'Passenger',
                          ping.id
                        )}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="location" size={16} color={colors.brand} />
                        <Text style={styles.pingLocationText}>
                          {ping.location_address || `${ping.location_latitude.toFixed(5)}, ${ping.location_longitude.toFixed(5)}`}
                        </Text>
                        <Ionicons name="open-outline" size={16} color={colors.brand} style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {ping.status === 'pending' && (
                    <View style={styles.pingActions}>
                      <TouchableOpacity 
                        style={[styles.pingActionButton, styles.acknowledgeButton]}
                        onPress={() => handleAcknowledgePing(ping.id)}
                        delayPressIn={0}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.pingActionButtonText}>Acknowledge</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
            )}
          />
        </SafeAreaView>
      </Modal>


    </View>
  );
}

const StatusCard = ({ isOnDuty, onOffDutyPress }) => {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusCardLeft}>
        <Text style={styles.statusLabel}>Current Status</Text>
        <View style={[styles.statusPill, isOnDuty ? styles.statusPillOn : styles.statusPillOff]}>
          <Ionicons
            name={isOnDuty ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={isOnDuty ? '#065F46' : '#B91C1C'}
          />
          <Text style={[styles.statusPillText, isOnDuty ? styles.statusPillTextOn : styles.statusPillTextOff]}>
            {isOnDuty ? 'On Duty' : 'Off Duty'}
          </Text>
        </View>
      </View>
      <View style={styles.statusCardRight}>
        {isOnDuty && (
          <TouchableOpacity style={styles.offDutyButton} onPress={onOffDutyPress}>
            <Ionicons name="stop-circle" size={18} color="#EF4444" />
            <Text style={styles.offDutyText}>Go Off Duty</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const ActiveTripCard = ({ route, passengerCount, tripStartTime, currentCapacity }) => {
  const duration = tripStartTime ? Math.floor((new Date() - tripStartTime) / 60000) : 0;

  const stats = [
    { label: 'Passengers', value: passengerCount, icon: 'people' },
    { label: 'Duration', value: `${duration}m`, icon: 'time' },
    { label: 'Capacity', value: `${currentCapacity}%`, icon: 'speedometer' },
  ];

  return (
    <View style={styles.activeTripCard}>
      <View style={styles.activeTripHeader}>
        <View style={styles.activeTripIcon}>
          <Ionicons name="bus" size={28} color={colors.brand} />
        </View>
        <View style={styles.activeTripText}>
          <Text style={styles.activeTripTitle}>Active Trip</Text>
          <Text style={styles.activeTripRoute}>{route}</Text>
        </View>
        <View style={styles.activeTripBadge}>
          <Text style={styles.activeTripBadgeText}>On Trip</Text>
        </View>
      </View>

      <View style={styles.activeTripStats}>
        {stats.map((item) => (
          <View key={item.label} style={styles.activeTripStat}>
            <Ionicons name={item.icon} size={20} color="#6B7280" />
            <Text style={styles.activeTripStatLabel}>{item.label}</Text>
            <Text style={styles.activeTripStatValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const OverviewCard = ({ icon, color, value, title }) => {
  return (
    <View style={styles.overviewCard}>
      <View style={[styles.overviewIcon, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.overviewContent}>
        <Text style={styles.overviewValue}>{value}</Text>
        <Text style={styles.overviewLabel}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.brand,
    paddingTop: Platform.OS === 'ios' 
      ? (Constants.statusBarHeight || 44) + spacing.md
      : (Constants.statusBarHeight || 24) + spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadows.floating,
  },
  headerInner: {
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholder: {
    width: 48,
    height: 48,
    marginRight: spacing.md,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'System',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    flex: 1,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.card,
  },
  headerStatusPillOn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#D1FAE5',
  },
  headerStatusPillOff: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  headerStatusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerStatusIconContainerOn: {
    backgroundColor: '#D1FAE5',
  },
  headerStatusIconContainerOff: {
    backgroundColor: '#FEE2E2',
  },
  headerStatusContent: {
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  headerStatusTitleOn: {
    color: '#065F46',
  },
  headerStatusTitleOff: {
    color: '#991B1B',
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatusDotOn: {
    backgroundColor: '#10B981',
  },
  headerStatusDotOff: {
    backgroundColor: '#EF4444',
  },
  headerStatusSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  statusCardWrapper: {
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xl,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  statusCardLeft: {
    flex: 1,
    marginRight: spacing.lg,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  statusPillOn: {
    backgroundColor: '#D1FAE5',
  },
  statusPillOff: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusPillTextOn: {
    color: '#065F46',
  },
  statusPillTextOff: {
    color: '#B91C1C',
  },
  statusCardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  offDutyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: spacing.xs,
  },
  offDutyText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  activeTripCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    ...shadows.card,
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  activeTripIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FFF1D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activeTripText: {
    flex: 1,
  },
  activeTripTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  activeTripRoute: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  activeTripBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  activeTripBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  activeTripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  activeTripStat: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeTripStatLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTripStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: spacing.lg,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  statsOverview: {
    marginBottom: spacing.xl,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  overviewCard: {
    width: '48%',
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    ...shadows.card,
  },
  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  overviewContent: {
    flex: 1,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 72) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f8f9fa',
  },
  quickActionCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    fontFamily: 'System',
  },
  quickActionTitleDisabled: {
    color: '#9CA3AF',
  },
  recentTripsSection: {
    marginBottom: 32,
  },
  tripsListCompact: {
  },
  tripCardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    marginBottom: 12,
    shadowRadius: 8,
    elevation: 2,
  },
  tripCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripCardRight: {
    alignItems: 'flex-end',
  },
  tripIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripInfoCompact: {
    flex: 1,
  },
  tripRouteCompact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    fontFamily: 'System',
  },
  tripTimeCompact: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadgeTextSmall: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  tripPassengersCompact: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  tripsList: {
    marginBottom: 32,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripRoute: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  tripDetails: {
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'System',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  modalSave: {
    fontSize: 16,
    color: colors.brand,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  passengerCounter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  passengerLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  counterButton: {
    backgroundColor: colors.brand,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  counterText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 32,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  capacityText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  passengerActions: {
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  pingButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    position: 'relative',
  },
  pingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  pingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyPingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyPingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyPingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  pingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pingUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pingUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  pingTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  pingStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pingStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pingBody: {
    marginBottom: 16,
  },
  pingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pingType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  pingMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  pingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  pingLocationText: {
    fontSize: 13,
    color: '#92400E',
    marginLeft: 6,
    flex: 1,
  },
  pingActions: {
    flexDirection: 'row',
  },
  pingActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 12,
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  pingActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 