import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';
import { getLocationStatus, getCapacityStatus, formatTime } from '../utils/locationUtils';

export default function BusListScreen({ navigation, route }) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(route.params?.filter || 'all');
  const [busCapacityStatus, setBusCapacityStatus] = useState({});
  const [realtimeBuses, setRealtimeBuses] = useState([]);
  const [useRealtime, setUseRealtime] = useState(true);

  // Get data from Supabase context
  const { 
    buses, 
    routes, 
    loading, 
    error, 
    refreshData,
    getBusCapacityStatus,
    supabase
  } = useSupabase();

  // Load real-time bus data
  const loadRealtimeBuses = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase client not available');
        return;
      }

      // Try to get real-time bus status, fallback to basic bus data
      const { data, error } = await supabase
        .rpc('get_realtime_bus_status');
      
      if (error) {
        console.warn('⚠️ Real-time function not available, using basic bus data:', error);
        // Fallback to basic bus data
        const { data: busData, error: busError } = await supabase
          .from('buses')
          .select('*')
          .eq('status', 'active');
        
        if (busError) throw busError;
        setRealtimeBuses(busData || []);
      } else {
        setRealtimeBuses(data || []);
      }
    } catch (err) {
      console.error('Error loading real-time buses:', err);
      setRealtimeBuses([]);
    }
  };

  // Load capacity status when buses data changes
  useEffect(() => {
    if (buses.length > 0) {
      loadCapacityStatus();
    }
  }, [buses]);

  // Load real-time data on mount and when refreshing
  useEffect(() => {
    if (useRealtime) {
      loadRealtimeBuses();
    }
  }, [useRealtime, refreshing]);

  const loadCapacityStatus = async () => {
    try {
      if (!buses || buses.length === 0) {
        console.warn('No buses available for capacity status');
        return;
      }

      const capacityPromises = buses.map(async (bus) => {
        try {
          const capacityData = await getBusCapacityStatus(bus.id);
          return { busId: bus.id, capacityData };
        } catch (err) {
          console.warn(`⚠️ Error getting capacity for bus ${bus.id}:`, err);
          return { 
            busId: bus.id, 
            capacityData: { 
              id: bus.id, 
              current_passengers: 0, 
              capacity_percentage: 0, 
              max_capacity: 50 
            } 
          };
        }
      });
      
      const capacityResults = await Promise.all(capacityPromises);
      const capacityMap = {};
      
      capacityResults.forEach(({ busId, capacityData }) => {
        capacityMap[busId] = capacityData;
      });
      
      setBusCapacityStatus(capacityMap);
    } catch (error) {
      console.error('Error loading capacity status:', error);
      // Set empty capacity map on error
      setBusCapacityStatus({});
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      await loadCapacityStatus();
      if (useRealtime) {
        await loadRealtimeBuses();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMenuPress = () => {
    navigation.getParent()?.openDrawer();
  };

  const handleBusPress = (bus) => {
    console.log('🚌 BusListScreen - Selected bus:', bus);
    console.log('🚌 BusListScreen - Passing ID:', bus.id);
    navigation.navigate('Map', { selectedBusId: bus.id });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'inactive':
        return '#FF6B6B';
      default:
        return '#FF9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  const getPwdSeatStatus = (pwdSeatsAvailable, pwdSeats) => {
    if (pwdSeatsAvailable > 0) {
      return { text: `${pwdSeatsAvailable} Available`, color: '#22c55e' };
    } else {
      return { text: 'Full', color: '#FF6B6B' };
    }
  };

  const getCapacityColor = (percentage) => {
    if (percentage <= 25) return '#22c55e'; // Green
    if (percentage <= 50) return '#FFC107'; // Yellow
    if (percentage <= 75) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getCapacityStatus = (percentage) => {
    if (percentage <= 25) return 'Low';
    if (percentage <= 50) return 'Moderate';
    if (percentage <= 75) return 'High';
    return 'Full';
  };

  // Transform database buses to match the expected format
  const transformBusData = (bus) => {
    const route = routes.find(r => r.id === bus.route_id);
    const capacityData = busCapacityStatus[bus.id];
    
    // Use real-time data if available, otherwise fall back to regular data
    const isRealtime = useRealtime && realtimeBuses.length > 0;
    const busData = isRealtime ? realtimeBuses.find(rb => rb.bus_id === bus.id) || bus : bus;
    
    const locationStatus = getLocationStatus(busData.last_location_update || bus.updated_at);
    const capacityStatus = getCapacityStatus(busData.capacity_percentage || bus.capacity_percentage || 0);
    
    const transformedBus = {
      id: bus.id, // Use id from the buses table
      route: busData.bus_name || bus.name || `Bus ${bus.bus_number}` || `Route ${route?.route_number}` || 'Unknown Bus',
      destination: route ? route.destination : 'Unknown',
      origin: route ? route.origin : 'Unknown',
      status: busData.tracking_status || bus.tracking_status || bus.status || 'active',
      avgFare: busData.avg_fare || bus.avg_fare || 15,
      passengers: busData.current_passengers || capacityData?.current_passengers || bus.current_passengers || 0,
      capacity: busData.max_capacity || capacityData?.max_capacity || bus.capacity || 45,
      capacityPercentage: busData.capacity_percentage || capacityData?.capacity_percentage || bus.capacity_percentage || 0,
      capacityStatus: busData.capacity_status || capacityData?.capacity_status || capacityStatus.status,
      pwdSeats: bus.pwd_seats || 4,
      pwdSeatsAvailable: bus.pwd_seats_available || 2,
      eta: bus.estimated_arrival || '5 min',
      distance: bus.distance || '2.3 km',
      latitude: busData.latitude || bus.latitude || 37.78825,
      longitude: busData.longitude || bus.longitude || -122.4324,
      lastUpdate: busData.last_location_update || bus.updated_at || new Date().toISOString(),
      locationStatus: locationStatus.status,
      locationStatusColor: locationStatus.color,
      isMoving: busData.is_moving || false,
      accuracy: busData.accuracy || null,
    };
    
    console.log('🚌 BusListScreen - Transforming bus:', {
      originalId: bus.id,
      routeNumber: route?.route_number,
      transformedId: transformedBus.id,
      route: transformedBus.route,
      isRealtime: isRealtime,
      locationStatus: transformedBus.locationStatus
    });
    
    return transformedBus;
  };

  const filteredBuses = buses.map(transformBusData).filter(bus => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'active') return bus.status === 'active';
    if (selectedFilter === 'pwd') return bus.pwdSeatsAvailable > 0;
    if (selectedFilter === 'nearby') return parseFloat(bus.distance) <= 5; // Within 5km
    if (selectedFilter === 'low-capacity') {
      const capacityData = busCapacityStatus[bus.id] || { capacity_percentage: 0 };
      return capacityData.capacity_percentage <= 50;
    }
    return true;
  });

  const renderBusItem = ({ item }) => {
    const pwdStatus = getPwdSeatStatus(item.pwdSeatsAvailable, item.pwdSeats);
    const capacityData = busCapacityStatus[item.id] || { capacity_percentage: 0, max_capacity: item.capacity };
    const capacityPercentage = capacityData.capacity_percentage || 0;
    const capacityColor = getCapacityColor(capacityPercentage);
    const capacityStatus = getCapacityStatus(capacityPercentage);
    
    return (
      <TouchableOpacity
        style={styles.busCard}
        onPress={() => handleBusPress(item)}
      >
        <View style={styles.busHeader}>
          <View style={styles.busInfo}>
            <Text style={styles.busRoute}>{item.route}</Text>
            <Text style={styles.busDirection}>{item.origin} → {item.destination}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            <View style={[styles.capacityIndicator, { backgroundColor: capacityColor }]}>
              <Text style={styles.capacityIndicatorText}>{capacityPercentage}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.busDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.detailText}>ETA: {item.eta}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.detailText}>{item.distance}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="card" size={16} color="#666" />
              <Text style={styles.detailText}>₱{item.avgFare} avg fare</Text>
            </View>
          </View>

        {/* Capacity Status Section */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityHeader}>
            <Ionicons name="pulse" size={16} color={capacityColor} />
            <Text style={[styles.capacityLabel, { color: capacityColor }]}>
              Capacity: {capacityPercentage}% ({capacityStatus})
            </Text>
          </View>
          <View style={styles.capacityBar}>
            <View style={styles.capacityBarBackground}>
              <View 
                style={[
                  styles.capacityBarFill, 
                  { 
                    width: `${capacityPercentage}%`,
                    backgroundColor: capacityColor
                  }
                ]} 
              />
            </View>
          </View>
        </View>

          <View style={styles.pwdSection}>
            <View style={styles.pwdInfo}>
              <Ionicons name="wheelchair" size={16} color={pwdStatus.color} />
              <Text style={[styles.pwdText, { color: pwdStatus.color }]}>
                PWD Seats: {pwdStatus.text}
            </Text>
          </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filter, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Available Buses</Text>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading bus data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Available Buses</Text>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load bus data</Text>
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
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {useRealtime ? 'Real-Time Buses' : 'Available Buses'}
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.realtimeButton, useRealtime && styles.realtimeButtonActive]} 
              onPress={() => setUseRealtime(!useRealtime)}
            >
              <Ionicons 
                name={useRealtime ? "radio" : "radio-outline"} 
                size={20} 
                color={useRealtime ? "#fff" : "#f59e0b"} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('all', 'All Buses')}
          {renderFilterButton('active', 'Active')}
          {renderFilterButton('pwd', 'PWD Accessible')}
          {renderFilterButton('nearby', 'Nearby')}
          {renderFilterButton('low-capacity', 'Low Capacity')}
        </ScrollView>
      </View>

      {/* Bus List */}
      <FlatList
        data={filteredBuses}
        renderItem={renderBusItem}
        keyExtractor={(item) => item.id}
        style={styles.busList}
        contentContainerStyle={styles.busListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f59e0b']}
            tintColor="#f59e0b"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    backgroundColor: '#f59e0b',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  realtimeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  realtimeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -0.8,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    transform: [{ scale: 1.05 }],
  },
  filterButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: -0.2,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  busList: {
    flex: 1,
  },
  busListContent: {
    padding: 20,
  },
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  busInfo: {
    flex: 1,
  },
  busRoute: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  busDirection: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  capacityIndicator: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  capacityIndicatorText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  busDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailText: {
    fontSize: 15,
    color: '#1a1a1a',
    marginLeft: 8,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  pwdSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  pwdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d1fae5',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pwdText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  capacitySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  capacityLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  capacityBar: {
    marginTop: 8,
  },
  capacityBarBackground: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'System',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'System',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
}); 