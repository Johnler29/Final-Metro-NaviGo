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
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';

const { width } = Dimensions.get('window');

export default function DriverNotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, urgent

  // Get data from Supabase context
  const { 
    buses, 
    routes, 
    drivers, 
    schedules, 
    loading, 
    error, 
    refreshData 
  } = useSupabase();

  // Mock notifications data - in real app, this would come from a notifications table
  const mockNotifications = [
    {
      id: '1',
      type: 'schedule',
      title: 'Schedule Change',
      message: 'Your 2:00 PM shift on Route 101 has been moved to 2:15 PM due to traffic conditions.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      isRead: false,
      isUrgent: false,
      priority: 'medium',
    },
    {
      id: '2',
      type: 'maintenance',
      title: 'Bus Maintenance Required',
      message: 'Bus #20 requires scheduled maintenance. Please report to maintenance bay after your current shift.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isRead: false,
      isUrgent: true,
      priority: 'high',
    },
    {
      id: '3',
      type: 'weather',
      title: 'Weather Alert',
      message: 'Heavy rain expected in your route area. Drive with extra caution and reduce speed.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      isRead: true,
      isUrgent: true,
      priority: 'high',
    },
    {
      id: '4',
      type: 'route',
      title: 'Route Update',
      message: 'Construction on Main Street. Temporary route adjustment required. Check updated route map.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      isRead: true,
      isUrgent: false,
      priority: 'medium',
    },
    {
      id: '5',
      type: 'performance',
      title: 'Performance Update',
      message: 'Great job this week! You achieved 98% on-time performance. Keep it up!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      isRead: true,
      isUrgent: false,
      priority: 'low',
    },
    {
      id: '6',
      type: 'system',
      title: 'App Update',
      message: 'New features available in the driver app. Update to version 2.1.0 for the latest improvements.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      isRead: true,
      isUrgent: false,
      priority: 'low',
    },
  ];

  useEffect(() => {
    setNotifications(mockNotifications);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'schedule':
        return 'calendar';
      case 'maintenance':
        return 'wrench';
      case 'weather':
        return 'cloudy';
      case 'route':
        return 'map';
      case 'performance':
        return 'trending-up';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return '#F44336';
    if (priority === 'medium') return '#FF9800';
    if (priority === 'low') return '#4CAF50';
    
    switch (type) {
      case 'maintenance':
        return '#FF5722';
      case 'weather':
        return '#2196F3';
      case 'schedule':
        return '#9C27B0';
      case 'route':
        return '#607D8B';
      case 'performance':
        return '#4CAF50';
      case 'system':
        return '#795548';
      default:
        return '#666';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const handleNotificationPress = (notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    // Handle notification action
    switch (notification.type) {
      case 'schedule':
        navigation.navigate('DriverSchedule');
        break;
      case 'maintenance':
        Alert.alert('Maintenance Required', 'Please contact maintenance department for details.');
        break;
      case 'weather':
        Alert.alert('Weather Alert', 'Drive safely and follow weather protocols.');
        break;
      case 'route':
        navigation.navigate('DriverMap');
        break;
      case 'performance':
        navigation.navigate('DriverProfile');
        break;
      case 'system':
        Alert.alert('App Update', 'Please update the app from the app store.');
        break;
      default:
        Alert.alert(notification.title, notification.message);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const handleDeleteNotification = (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotifications(prev => 
              prev.filter(n => n.id !== notificationId)
            );
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      // In real app, this would fetch new notifications
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'urgent') return notification.isUrgent;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => n.isUrgent && !n.isRead).length;

  const handleMenuPress = () => {
    // Drawer removed
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load notifications</Text>
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
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Notification Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{urgentCount}</Text>
            <Text style={styles.statLabel}>Urgent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{notifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'unread' && styles.activeFilter]}
              onPress={() => setFilter('unread')}
            >
              <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
                Unread ({unreadCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'urgent' && styles.activeFilter]}
              onPress={() => setFilter('urgent')}
            >
              <Text style={[styles.filterText, filter === 'urgent' && styles.activeFilterText]}>
                Urgent ({urgentCount})
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={16} color="#f59e0b" />
          <Text style={styles.actionButtonText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.unreadCard,
                notification.isUrgent && styles.urgentCard
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.notificationIconContainer}>
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={20}
                    color={getNotificationColor(notification.type, notification.priority)}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <View style={styles.notificationBadges}>
                      {!notification.isRead && (
                        <View style={styles.unreadBadge} />
                      )}
                      {notification.isUrgent && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentBadgeText}>URGENT</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {getTimeAgo(notification.timestamp)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteNotification(notification.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'unread' 
                ? 'No unread notifications' 
                : filter === 'urgent' 
                ? 'No urgent notifications' 
                : 'You\'re all caught up!'}
            </Text>
          </View>
        )}
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
    marginBottom: 15,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    fontFamily: 'System',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#f59e0b',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#f59e0b',
    marginLeft: 6,
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    fontFamily: 'System',
  },
  notificationBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  urgentBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: 'System',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'System',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
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
