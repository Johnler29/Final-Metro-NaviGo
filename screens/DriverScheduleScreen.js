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
import { colors, spacing, radius, shadows } from '../styles/uiTheme';

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
        return colors.success;
      case 'active':
        return colors.info;
      case 'scheduled':
        return colors.brand;
      default:
        return colors.textMuted;
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
    // Drawer removed
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
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading schedule data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color={colors.danger} />
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
            <View style={styles.detailIconContainer}>
              <Ionicons name="people" size={16} color={colors.info} />
            </View>
            <Text style={styles.detailText}>{shift.passengers} passengers</Text>
          </View>
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="speedometer" size={16} color={colors.brand} />
            </View>
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
              <View style={styles.noShiftsIconContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              </View>
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
              <View style={[styles.summaryIconContainer, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
              <Text style={styles.summaryValue}>3</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="play-circle" size={24} color={colors.info} />
              </View>
              <Text style={styles.summaryValue}>1</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.brandSoft }]}>
                <Ionicons name="time" size={24} color={colors.brand} />
              </View>
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
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.brand,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  weekOverview: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    minWidth: 88,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  selectedDayCard: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
    ...shadows.floating,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDayName: {
    color: '#fff',
  },
  dayDate: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  selectedDayDate: {
    color: '#fff',
  },
  shiftCount: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  shiftCountText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  selectedShiftCountText: {
    color: '#fff',
  },
  shiftsSection: {
    marginBottom: spacing.xxl,
  },
  shiftsList: {
    gap: spacing.md,
  },
  shiftCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.floating,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  shiftInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  shiftRoute: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  shiftTime: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  shiftDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  detailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  detailText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  noShiftsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  noShiftsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  noShiftsText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'System',
  },
  noShiftsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: spacing.xl,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxxl,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.danger,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  errorSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontWeight: '500',
    fontFamily: 'System',
  },
  retryButton: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    ...shadows.floating,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
}); 