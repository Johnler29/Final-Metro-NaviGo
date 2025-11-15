import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';

const { width } = Dimensions.get('window');

export default function DriverAnalyticsScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get data from Supabase context
  const { 
    buses, 
    routes, 
    drivers, 
    schedules, 
    loading: contextLoading, 
    error, 
    refreshData,
    getDriverPerformance
  } = useSupabase();

  const periods = [
    { id: 'week', label: 'This Week', days: 7 },
    { id: 'month', label: 'This Month', days: 30 },
    { id: 'year', label: 'This Year', days: 365 },
  ];

  useEffect(() => {
    calculateAnalytics();
  }, [selectedPeriod, schedules, buses, drivers]);

  const calculateAnalytics = async () => {
    setLoading(true);
    
    try {
      const currentDriver = drivers.find(d => d.license_number === 'DL123456789') || drivers[0];
      
      if (!currentDriver) {
        setAnalytics(null);
        setLoading(false);
        return;
      }

      // Get real performance data from database
      const performanceData = await getDriverPerformance(currentDriver.id, selectedPeriod);
      
      const completedTrips = performanceData.filter(s => s.status === 'completed');
      const totalPassengers = completedTrips.reduce((sum, trip) => sum + (trip.passengers_count || 0), 0);
      const totalDistance = completedTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      
      // Calculate on-time performance
      const onTimeTrips = completedTrips.filter(trip => {
        const scheduledTime = new Date(trip.departure_time);
        const actualTime = new Date(trip.actual_departure_time || trip.departure_time);
        const timeDiff = Math.abs(actualTime - scheduledTime) / (1000 * 60); // minutes
        return timeDiff <= 5; // 5 minutes tolerance
      });

      const onTimePercentage = completedTrips.length > 0 ? 
        (onTimeTrips.length / completedTrips.length) * 100 : 0;

      // Calculate average speed
      const totalTime = completedTrips.reduce((sum, trip) => {
        const start = new Date(trip.departure_time);
        const end = new Date(trip.actual_arrival_time || trip.arrival_time || trip.departure_time);
        return sum + (end - start) / (1000 * 60); // minutes
      }, 0);

      const averageSpeed = totalTime > 0 ? (totalDistance / totalTime) * 60 : 0; // km/h

      // Calculate fuel efficiency (mock data - would come from fuel tracking)
      const fuelEfficiency = totalDistance > 0 ? (totalDistance / 8).toFixed(1) : 0; // km per liter

      // Calculate safety score (mock data - would come from safety incidents)
      const safetyScore = Math.min(100, Math.max(0, 100 - (Math.random() * 10)));

      // Calculate customer satisfaction (mock data - would come from feedback)
      const customerSatisfaction = Math.min(5, Math.max(1, 4.2 + (Math.random() * 0.8)));

      setAnalytics({
        totalTrips: completedTrips.length,
        totalPassengers,
        totalDistance: totalDistance.toFixed(1),
        onTimePercentage: onTimePercentage.toFixed(1),
        averageSpeed: averageSpeed.toFixed(1),
        fuelEfficiency,
        safetyScore: safetyScore.toFixed(1),
        customerSatisfaction: customerSatisfaction.toFixed(1),
        workingHours: (totalTime / 60).toFixed(1),
        revenue: (totalPassengers * 50).toFixed(0), // Mock fare calculation
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
      // Fallback to mock data if database fails
      const currentDriver = drivers.find(d => d.license_number === 'DL123456789') || drivers[0];
      const driverBuses = buses.filter(bus => bus.driver_id === currentDriver?.id);
      const driverSchedules = schedules.filter(schedule => 
        driverBuses.some(bus => bus.id === schedule.bus_id)
      );

      const now = new Date();
      const periodStart = new Date(now.getTime() - periods.find(p => p.id === selectedPeriod).days * 24 * 60 * 60 * 1000);
      
      const periodSchedules = driverSchedules.filter(schedule => 
        new Date(schedule.departure_time) >= periodStart
      );

      const completedTrips = periodSchedules.filter(s => s.status === 'completed');
      const totalPassengers = completedTrips.reduce((sum, trip) => sum + (trip.passengers_count || 0), 0);
      const totalDistance = completedTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);

      setAnalytics({
        totalTrips: completedTrips.length,
        totalPassengers,
        totalDistance: totalDistance.toFixed(1),
        onTimePercentage: '85.0',
        averageSpeed: '25.0',
        fuelEfficiency: '8.5',
        safetyScore: '92.0',
        customerSatisfaction: '4.5',
        workingHours: '40.0',
        revenue: (totalPassengers * 50).toFixed(0),
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (value, type) => {
    if (type === 'percentage') {
      if (value >= 90) return '#4CAF50';
      if (value >= 70) return '#FF9800';
      return '#F44336';
    }
    if (type === 'rating') {
      if (value >= 4.5) return '#4CAF50';
      if (value >= 3.5) return '#FF9800';
      return '#F44336';
    }
    if (type === 'score') {
      if (value >= 90) return '#4CAF50';
      if (value >= 70) return '#FF9800';
      return '#F44336';
    }
    return '#666';
  };

  const getPerformanceLabel = (value, type) => {
    if (type === 'percentage') {
      if (value >= 90) return 'Excellent';
      if (value >= 70) return 'Good';
      return 'Needs Improvement';
    }
    if (type === 'rating') {
      if (value >= 4.5) return 'Excellent';
      if (value >= 3.5) return 'Good';
      return 'Needs Improvement';
    }
    if (type === 'score') {
      if (value >= 90) return 'Excellent';
      if (value >= 70) return 'Good';
      return 'Needs Improvement';
    }
    return '';
  };

  const handleMenuPress = () => {
    navigation.getParent()?.openDrawer();
  };

  const handleExportData = () => {
    Alert.alert('Export Data', 'Export feature coming soon!');
  };

  if (contextLoading || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load analytics</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
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
          <Text style={styles.headerTitle}>Performance Analytics</Text>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.activePeriodButton
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period.id && styles.activePeriodText
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="car-multiple" size={24} color="#4CAF50" />
            <Text style={styles.metricValue}>{analytics?.totalTrips || 0}</Text>
            <Text style={styles.metricLabel}>Total Trips</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="account-group" size={24} color="#2196F3" />
            <Text style={styles.metricValue}>{analytics?.totalPassengers || 0}</Text>
            <Text style={styles.metricLabel}>Passengers</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="speedometer" size={24} color="#FF9800" />
            <Text style={styles.metricValue}>{analytics?.totalDistance || 0} km</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="clock-check" size={24} color="#9C27B0" />
            <Text style={styles.metricValue}>{analytics?.onTimePercentage || 0}%</Text>
            <Text style={styles.metricLabel}>On Time</Text>
          </View>
        </View>

        {/* Performance Indicators */}
        <Text style={styles.sectionTitle}>Performance Indicators</Text>
        <View style={styles.indicatorsList}>
          <View style={styles.indicatorCard}>
            <View style={styles.indicatorHeader}>
              <Ionicons name="time" size={20} color="#666" />
              <Text style={styles.indicatorTitle}>On-Time Performance</Text>
              <Text style={[
                styles.indicatorValue,
                { color: getPerformanceColor(analytics?.onTimePercentage, 'percentage') }
              ]}>
                {analytics?.onTimePercentage || 0}%
              </Text>
            </View>
            <Text style={[
              styles.indicatorLabel,
              { color: getPerformanceColor(analytics?.onTimePercentage, 'percentage') }
            ]}>
              {getPerformanceLabel(analytics?.onTimePercentage, 'percentage')}
            </Text>
          </View>

          <View style={styles.indicatorCard}>
            <View style={styles.indicatorHeader}>
              <Ionicons name="star" size={20} color="#666" />
              <Text style={styles.indicatorTitle}>Customer Satisfaction</Text>
              <Text style={[
                styles.indicatorValue,
                { color: getPerformanceColor(analytics?.customerSatisfaction, 'rating') }
              ]}>
                {analytics?.customerSatisfaction || 0}/5
              </Text>
            </View>
            <Text style={[
              styles.indicatorLabel,
              { color: getPerformanceColor(analytics?.customerSatisfaction, 'rating') }
            ]}>
              {getPerformanceLabel(analytics?.customerSatisfaction, 'rating')}
            </Text>
          </View>

          <View style={styles.indicatorCard}>
            <View style={styles.indicatorHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#666" />
              <Text style={styles.indicatorTitle}>Safety Score</Text>
              <Text style={[
                styles.indicatorValue,
                { color: getPerformanceColor(analytics?.safetyScore, 'score') }
              ]}>
                {analytics?.safetyScore || 0}/100
              </Text>
            </View>
            <Text style={[
              styles.indicatorLabel,
              { color: getPerformanceColor(analytics?.safetyScore, 'score') }
            ]}>
              {getPerformanceLabel(analytics?.safetyScore, 'score')}
            </Text>
          </View>
        </View>

        {/* Additional Stats */}
        <Text style={styles.sectionTitle}>Additional Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics?.averageSpeed || 0} km/h</Text>
            <Text style={styles.statLabel}>Average Speed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics?.fuelEfficiency || 0} km/L</Text>
            <Text style={styles.statLabel}>Fuel Efficiency</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics?.workingHours || 0} hrs</Text>
            <Text style={styles.statLabel}>Working Hours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₱{analytics?.revenue || 0}</Text>
            <Text style={styles.statLabel}>Revenue Generated</Text>
          </View>
        </View>

        {/* Performance Chart Placeholder */}
        <Text style={styles.sectionTitle}>Performance Trend</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color="#ccc" />
          <Text style={styles.chartText}>Performance Chart</Text>
          <Text style={styles.chartSubtext}>Visual analytics coming soon</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <Ionicons name="download" size={20} color="#f59e0b" />
            <Text style={styles.actionButtonText}>Export Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share" size={20} color="#f59e0b" />
            <Text style={styles.actionButtonText}>Share Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePeriodButton: {
    backgroundColor: '#f59e0b',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  activePeriodText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  metricCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'System',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'System',
  },
  indicatorsList: {
    marginBottom: 25,
  },
  indicatorCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
    flex: 1,
    fontFamily: 'System',
  },
  indicatorValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  indicatorLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'System',
  },
  chartPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  chartText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12,
    fontFamily: 'System',
  },
  chartSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    fontFamily: 'System',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#f59e0b',
    marginLeft: 8,
    fontWeight: '600',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'System',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    paddingHorizontal: 32,
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
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
