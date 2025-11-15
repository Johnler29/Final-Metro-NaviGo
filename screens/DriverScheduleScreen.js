import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';

const { width } = Dimensions.get('window');

export default function DriverScheduleScreen({ navigation }) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  // Get data from Supabase context
  const { 
    schedules, 
    routes, 
    loading, 
    error, 
    refreshData 
  } = useSupabase();

  // Generate weekly schedule from real data
  const generateWeeklySchedule = () => {
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    
    return weekDays.map((day, index) => {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + (index - today.getDay()));
      
      // Filter schedules for this day
      const daySchedules = schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.departure_time);
        return scheduleDate.getDay() === index;
      });

      return {
        day: day,
        date: dayDate.getDate().toString(),
        shifts: daySchedules.map(schedule => {
          const route = routes.find(r => r.id === schedule.route_id);
          return {
            id: schedule.id,
            route: route ? `Route ${route.route_number}` : `Route ${schedule.route_id}`,
            startTime: new Date(schedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(schedule.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: schedule.status || 'scheduled',
            passengers: schedule.passengers_count || 0,
            distance: `${(schedule.distance || 0).toFixed(1)} km`,
          };
        }),
      };
    });
  };

  const weeklySchedule = generateWeeklySchedule();

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'active':
        return '#2196F3';
      case 'scheduled':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'scheduled':
        return 'Scheduled';
      default:
        return 'Unknown';
    }
  };

  const handleShiftPress = (shift) => {
    Alert.alert(
      `Shift Details - ${shift.route}`,
      `Time: ${shift.startTime} - ${shift.endTime}\nStatus: ${getStatusText(shift.status)}\nPassengers: ${shift.passengers}\nDistance: ${shift.distance}`,
      [
        { text: 'OK' },
        { 
          text: 'Start Shift', 
          onPress: () => {
            if (shift.status === 'scheduled') {
              Alert.alert('Shift Started', 'Your shift has been started successfully!');
            } else {
              Alert.alert('Shift Status', 'This shift cannot be started.');
            }
          }
        }
      ]
    );
  };

  const handleProfilePress = () => {
    Alert.alert('Profile', 'Driver profile screen coming soon!');
  };

  const handleMenuPress = () => {
    navigation.getParent()?.openDrawer();
  };

  const handleRoleSwitch = () => {
    Alert.alert(
      'Switch to Passenger Mode',
      'Are you a passenger?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch to Passenger',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading schedule data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load schedule data</Text>
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

  const renderShiftCard = (shift) => (
    <Pressable
      key={shift.id}
      style={({ pressed }) => [
        styles.shiftCard,
        pressed && styles.cardPressed,
      ]}
      onPress={() => handleShiftPress(shift)}
    >
      <View style={styles.shiftHeader}>
        <View style={styles.shiftInfo}>
          <Text style={styles.shiftRoute}>{shift.route}</Text>
          <Text style={styles.shiftTime}>{shift.startTime} - {shift.endTime}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status) }]}>
          <Text style={styles.statusBadgeText}>{getStatusText(shift.status)}</Text>
        </View>
      </View>

      <View style={styles.shiftDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.detailText}>{shift.passengers} passengers</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer" size={16} color="#666" />
            <Text style={styles.detailText}>{shift.distance}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderDayCard = (day, index) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.dayCard,
        selectedDay === index && styles.selectedDayCard
      ]}
      onPress={() => setSelectedDay(index)}
    >
      <Text style={[
        styles.dayName,
        selectedDay === index && styles.selectedDayName
      ]}>
        {day.day}
      </Text>
      <Text style={[
        styles.dayDate,
        selectedDay === index && styles.selectedDayDate
      ]}>
        {day.date}
      </Text>
      <View style={styles.shiftCount}>
        <Text style={[
          styles.shiftCountText,
          selectedDay === index && styles.selectedShiftCountText
        ]}>
          {day.shifts.length} shift{day.shifts.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Work Schedule</Text>
            <Text style={styles.headerSubtitle}>Metro NaviGo Driver</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <Ionicons name="person-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Week Overview */}
        <View style={styles.weekOverview}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.daysContainer}>
              {weeklySchedule.map((day, index) => renderDayCard(day, index))}
            </View>
          </ScrollView>
        </View>

        {/* Selected Day Shifts */}
        <View style={styles.shiftsSection}>
          <Text style={styles.sectionTitle}>
            {weeklySchedule[selectedDay].day} - {weeklySchedule[selectedDay].date}
          </Text>
          
          {weeklySchedule[selectedDay].shifts.length > 0 ? (
            <View style={styles.shiftsList}>
              {weeklySchedule[selectedDay].shifts.map(renderShiftCard)}
            </View>
          ) : (
            <View style={styles.noShiftsCard}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.noShiftsText}>No shifts scheduled</Text>
              <Text style={styles.noShiftsSubtext}>Enjoy your day off!</Text>
            </View>
          )}
        </View>

        {/* Weekly Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.summaryValue}>3</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="play-circle" size={24} color="#2196F3" />
              <Text style={styles.summaryValue}>1</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="time" size={24} color="#FF9800" />
              <Text style={styles.summaryValue}>3</Text>
              <Text style={styles.summaryLabel}>Scheduled</Text>
            </View>
          </View>
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
    paddingHorizontal: 24,
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
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'System',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  profileButton: {
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
  weekOverview: {
    marginTop: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  selectedDayCard: {
    backgroundColor: '#f59e0b',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    fontFamily: 'System',
  },
  selectedDayName: {
    color: '#fff',
  },
  dayDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'System',
  },
  selectedDayDate: {
    color: '#fff',
  },
  shiftCount: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shiftCountText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'System',
  },
  selectedShiftCountText: {
    color: '#fff',
  },
  shiftsSection: {
    marginBottom: 25,
  },
  shiftsList: {
    gap: 12,
  },
  shiftCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftInfo: {
    flex: 1,
  },
  shiftRoute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
    fontFamily: 'System',
  },
  shiftTime: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'System',
  },
  shiftDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontFamily: 'System',
  },
  noShiftsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  noShiftsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
    fontFamily: 'System',
  },
  noShiftsSubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'System',
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'System',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'System',
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
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 10,
    marginBottom: 5,
    fontFamily: 'System',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
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