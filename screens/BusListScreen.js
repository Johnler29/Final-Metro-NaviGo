import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../styles/uiTheme';
import { useSupabase } from '../contexts/SupabaseContext';
import { getLocationStatus, getCapacityStatus, formatTime } from '../utils/locationUtils';

export default function BusListScreen({ navigation, route }) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(route.params?.filter || 'all');
  const [busCapacityStatus, setBusCapacityStatus] = useState({});
  const [realtimeBuses, setRealtimeBuses] = useState([]);

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
    loadRealtimeBuses();
  }, [refreshing]);

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
      await loadRealtimeBuses();
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
    // Use palette-only colors: orange for active, gray for others
    switch (status) {
      case 'active':
        return colors.brand;
      case 'inactive':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
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
      return { text: `${pwdSeatsAvailable} Available`, color: colors.success };
    }
    return { text: 'Full', color: colors.textSecondary };
  };

  const getCapacityColor = () => {
    // Single accent color for capacity to avoid extra palette variants
    return colors.brand;
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
    const isRealtime = realtimeBuses.length > 0;
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
              <Ionicons name="time" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>ETA: {item.eta}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>{item.distance}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="card" size={16} color={colors.textSecondary} />
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
              <Ionicons name="arrow-back-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Available buses</Text>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
              <Ionicons name="menu-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
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
              <Ionicons name="arrow-back-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Available buses</Text>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
              <Ionicons name="menu-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color={colors.danger} />
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
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Available buses</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('all', 'All buses')}
          {renderFilterButton('active', 'Active')}
          {renderFilterButton('pwd', 'PWD accessible')}
          {renderFilterButton('nearby', 'Nearby')}
          {renderFilterButton('low-capacity', 'Low capacity')}
        </ScrollView>
      </View>

      {/* Divider below filters */}
      <View style={styles.sectionDivider} />

      {/* Bus List with pull-to-refresh even when empty */}
      <FlatList
        data={filteredBuses}
        renderItem={renderBusItem}
        keyExtractor={(item) => item.id}
        style={styles.busList}
        contentContainerStyle={[
          styles.busListContent,
          filteredBuses.length === 0 && styles.busListEmptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyStateWrapper}>
            <View style={styles.emptyStateCard}>
              <Ionicons name="bus-outline" size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyStateTitle}>No available buses</Text>
            <Text style={styles.emptyStateSubtitle}>
              There are currently no buses that match your filters. Pull down to refresh or adjust the filters.
            </Text>
          </View>
        }
      />
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
    paddingTop: 52,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -0.8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  filterButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterButtonActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  filterButtonText: {
    color: colors.textSecondary,
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
  padding: spacing.lg,
  },
  busListEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  busCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  busDirection: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
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
    color: colors.textSecondary,
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  capacityIndicator: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  capacityIndicatorText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  busDetails: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  detailText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 8,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  pwdSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  pwdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  pwdText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  capacitySection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  capacityLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  capacityBar: {
    marginTop: spacing.sm,
  },
  capacityBarBackground: {
    height: 10,
    backgroundColor: colors.borderMuted,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: radius.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'System',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'System',
  },
  retryButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    ...shadows.floating,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateCard: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 