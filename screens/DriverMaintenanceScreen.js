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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';

const { width } = Dimensions.get('window');

export default function DriverMaintenanceScreen({ navigation }) {
  const [maintenanceAlerts, setMaintenanceAlerts] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    issue: '',
    description: '',
    priority: 'medium',
    location: '',
  });
  const [isReporting, setIsReporting] = useState(false);

  // Get data from Supabase context
  const { 
    buses, 
    routes, 
    drivers, 
    loading, 
    error, 
    refreshData,
    reportMaintenanceIssue
  } = useSupabase();

  // Mock maintenance alerts data
  const mockAlerts = [
    {
      id: '1',
      busNumber: 'B001',
      issue: 'Engine Oil Change',
      description: 'Regular maintenance due - oil change required',
      priority: 'medium',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: 'pending',
      type: 'scheduled',
    },
    {
      id: '2',
      busNumber: 'B002',
      issue: 'Brake System Check',
      description: 'Brake pads need inspection and possible replacement',
      priority: 'high',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      status: 'pending',
      type: 'scheduled',
    },
    {
      id: '3',
      busNumber: 'B001',
      issue: 'Air Conditioning',
      description: 'AC not cooling properly - needs service',
      priority: 'low',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      status: 'pending',
      type: 'scheduled',
    },
    {
      id: '4',
      busNumber: 'B003',
      issue: 'Tire Replacement',
      description: 'Front left tire showing signs of wear',
      priority: 'high',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
      status: 'overdue',
      type: 'scheduled',
    },
  ];

  const issueTypes = [
    { id: 'engine', label: 'Engine', icon: 'engine' },
    { id: 'brakes', label: 'Brakes', icon: 'car-brake-abs' },
    { id: 'tires', label: 'Tires', icon: 'tire' },
    { id: 'electrical', label: 'Electrical', icon: 'flash' },
    { id: 'ac', label: 'Air Conditioning', icon: 'snowflake' },
    { id: 'body', label: 'Body/Exterior', icon: 'car' },
    { id: 'interior', label: 'Interior', icon: 'seat' },
    { id: 'other', label: 'Other', icon: 'wrench' },
  ];

  const priorityLevels = [
    { id: 'low', label: 'Low', color: '#4CAF50' },
    { id: 'medium', label: 'Medium', color: '#FF9800' },
    { id: 'high', label: 'High', color: '#F44336' },
    { id: 'urgent', label: 'Urgent', color: '#9C27B0' },
  ];

  useEffect(() => {
    setMaintenanceAlerts(mockAlerts);
  }, []);

  const getPriorityColor = (priority) => {
    const level = priorityLevels.find(p => p.id === priority);
    return level ? level.color : '#666';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'overdue':
        return '#F44336';
      case 'in_progress':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const diff = dueDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  const handleReportIssue = () => {
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportForm.issue || !reportForm.description.trim()) {
      Alert.alert('Missing Information', 'Please select an issue type and provide a description.');
      return;
    }

    setIsReporting(true);
    
    try {
      const currentDriver = drivers.find(d => d.license_number === 'DL123456789') || drivers[0];
      
      // Report maintenance issue to database
      await reportMaintenanceIssue(currentDriver.id, {
        issue: reportForm.issue,
        description: reportForm.description,
        priority: reportForm.priority,
        location: reportForm.location || 'Unknown'
      });
      
      Alert.alert(
        'Issue Reported',
        'Your maintenance report has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowReportModal(false);
              setReportForm({
                issue: '',
                description: '',
                priority: 'medium',
                location: '',
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reporting maintenance issue:', error);
      Alert.alert('Error', 'Failed to submit maintenance report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleAlertPress = (alert) => {
    Alert.alert(
      `Maintenance Alert - Bus ${alert.busNumber}`,
      `${alert.issue}\n\n${alert.description}\n\nDue: ${getDaysUntilDue(alert.dueDate)}`,
      [
        { text: 'OK' },
        { 
          text: 'Mark as Started', 
          onPress: () => {
            setMaintenanceAlerts(prev => 
              prev.map(a => 
                a.id === alert.id ? { ...a, status: 'in_progress' } : a
              )
            );
            Alert.alert('Status Updated', 'Maintenance marked as in progress.');
          }
        }
      ]
    );
  };

  const handleMenuPress = () => {
    // Drawer removed
  };

  const filteredAlerts = maintenanceAlerts.sort((a, b) => {
    // Sort by priority and due date
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const statusOrder = { overdue: 4, pending: 3, in_progress: 2, completed: 1 };
    
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[b.status] - statusOrder[a.status];
    }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const overdueCount = maintenanceAlerts.filter(a => a.status === 'overdue').length;
  const pendingCount = maintenanceAlerts.filter(a => a.status === 'pending').length;
  const inProgressCount = maintenanceAlerts.filter(a => a.status === 'in_progress').length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading maintenance data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load maintenance data</Text>
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
          <Text style={styles.headerTitle}>Maintenance</Text>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Maintenance Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{overdueCount}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{inProgressCount}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Report Issue Button */}
        <TouchableOpacity style={styles.reportButton} onPress={handleReportIssue}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.reportButtonText}>Report New Issue</Text>
        </TouchableOpacity>

        {/* Maintenance Alerts */}
        <Text style={styles.sectionTitle}>Maintenance Alerts</Text>
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                alert.status === 'overdue' && styles.overdueCard,
                alert.priority === 'urgent' && styles.urgentCard
              ]}
              onPress={() => handleAlertPress(alert)}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertInfo}>
                  <Text style={styles.busNumber}>Bus {alert.busNumber}</Text>
                  <Text style={styles.issueTitle}>{alert.issue}</Text>
                </View>
                <View style={styles.alertBadges}>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(alert.priority) }
                  ]}>
                    <Text style={styles.priorityText}>{alert.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(alert.status) }
                  ]}>
                    <Text style={styles.statusText}>{alert.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.alertDescription}>{alert.description}</Text>
              
              <View style={styles.alertFooter}>
                <View style={styles.dueDateContainer}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={[
                    styles.dueDate,
                    alert.status === 'overdue' && styles.overdueText
                  ]}>
                    {getDaysUntilDue(alert.dueDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            <Text style={styles.emptyText}>All Good!</Text>
            <Text style={styles.emptySubtext}>No maintenance alerts at this time</Text>
          </View>
        )}

        {/* Maintenance Tips */}
        <Text style={styles.sectionTitle}>Maintenance Tips</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Check tire pressure weekly</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Report unusual noises immediately</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Keep maintenance records updated</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Follow scheduled maintenance intervals</Text>
          </View>
        </View>
      </ScrollView>

      {/* Report Issue Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Issue</Text>
            <TouchableOpacity onPress={handleSubmitReport} disabled={isReporting}>
              <Text style={[styles.modalSave, isReporting && styles.disabledText]}>
                {isReporting ? 'Reporting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Issue Type *</Text>
              <View style={styles.issueTypesGrid}>
                {issueTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.issueTypeButton,
                      reportForm.issue === type.id && styles.selectedIssueType
                    ]}
                    onPress={() => setReportForm({...reportForm, issue: type.id})}
                  >
                    <MaterialCommunityIcons name={type.icon} size={20} color="#666" />
                    <Text style={styles.issueTypeText}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority *</Text>
              <View style={styles.priorityButtons}>
                {priorityLevels.map((priority) => (
                  <TouchableOpacity
                    key={priority.id}
                    style={[
                      styles.priorityButton,
                      { borderColor: priority.color },
                      reportForm.priority === priority.id && { backgroundColor: priority.color }
                    ]}
                    onPress={() => setReportForm({...reportForm, priority: priority.id})}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { color: priority.color },
                      reportForm.priority === priority.id && { color: '#fff' }
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={styles.textArea}
                value={reportForm.description}
                onChangeText={(text) => setReportForm({...reportForm, description: text})}
                placeholder="Describe the issue in detail..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={reportForm.location}
                onChangeText={(text) => setReportForm({...reportForm, location: text})}
                placeholder="Where did you notice the issue?"
              />
            </View>

            {isReporting && (
              <View style={styles.reportingIndicator}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.reportingText}>Submitting report...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reportButton: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 24,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'System',
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'System',
  },
  alertBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'System',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontFamily: 'System',
  },
  overdueText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: 'System',
  },
  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'System',
  },
  modalSave: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  disabledText: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'System',
  },
  issueTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  issueTypeButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedIssueType: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  issueTypeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'System',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
    fontFamily: 'System',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontFamily: 'System',
  },
  reportingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  reportingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'System',
  },
});
