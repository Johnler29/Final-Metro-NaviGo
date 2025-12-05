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

export default function DriverEmergencyScreen({ navigation }) {
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [location, setLocation] = useState(null);

  // Get data from Supabase context
  const { 
    buses, 
    routes, 
    drivers, 
    loading, 
    error, 
    refreshData,
    reportEmergency
  } = useSupabase();

  const emergencyTypes = [
    {
      id: 'medical',
      title: 'Medical Emergency',
      description: 'Passenger or driver medical emergency',
      icon: 'medical-bag',
      color: '#F44336',
      urgent: true,
    },
    {
      id: 'accident',
      title: 'Traffic Accident',
      description: 'Vehicle accident or collision',
      icon: 'car-crash',
      color: '#FF5722',
      urgent: true,
    },
    {
      id: 'mechanical',
      title: 'Mechanical Issue',
      description: 'Bus breakdown or mechanical problem',
      icon: 'wrench',
      color: '#FF9800',
      urgent: false,
    },
    {
      id: 'safety',
      title: 'Safety Concern',
      description: 'Passenger safety or security issue',
      icon: 'shield-alert',
      color: '#9C27B0',
      urgent: false,
    },
    {
      id: 'route',
      title: 'Route Problem',
      description: 'Road closure or route obstruction',
      icon: 'road',
      color: '#607D8B',
      urgent: false,
    },
    {
      id: 'other',
      title: 'Other Emergency',
      description: 'Other urgent situation',
      icon: 'alert-circle',
      color: '#795548',
      urgent: false,
    },
  ];

  const quickContacts = [
    {
      name: 'Emergency Services',
      number: '911',
      icon: 'call',
      color: '#F44336',
    },
    {
      name: 'Dispatch Center',
      number: '+1-234-567-8900',
      icon: 'radio',
      color: '#2196F3',
    },
    {
      name: 'Supervisor',
      number: '+1-234-567-8901',
      icon: 'person',
      color: '#4CAF50',
    },
    {
      name: 'Maintenance',
      number: '+1-234-567-8902',
      icon: 'build',
      color: '#FF9800',
    },
  ];

  const handleEmergencyTypeSelect = (type) => {
    setEmergencyType(type);
    setShowReportModal(true);
  };

  const handleReportEmergency = async () => {
    if (!emergencyType || !emergencyDescription.trim()) {
      Alert.alert('Missing Information', 'Please select an emergency type and provide a description.');
      return;
    }

    setIsReporting(true);
    
    try {
      const currentDriver = drivers.find(d => d.license_number === 'DL123456789') || drivers[0];
      
      // Report emergency to database
      await reportEmergency(currentDriver.id, {
        type: emergencyType,
        description: emergencyDescription,
        location: location ? `${location.coords.latitude}, ${location.coords.longitude}` : 'Unknown',
        priority: emergencyTypes.find(t => t.id === emergencyType)?.urgent ? 'high' : 'medium'
      });
      
      Alert.alert(
        'Emergency Reported',
        'Your emergency report has been submitted successfully. Help is on the way.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowReportModal(false);
              setEmergencyType('');
              setEmergencyDescription('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reporting emergency:', error);
      Alert.alert('Error', 'Failed to submit emergency report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleCallContact = (contact) => {
    Alert.alert(
      'Call Contact',
      `Call ${contact.name} at ${contact.number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            // In real app, this would initiate a phone call
            Alert.alert('Calling', `Calling ${contact.name}...`);
          }
        }
      ]
    );
  };

  const handleSOS = () => {
    Alert.alert(
      'SOS Emergency',
      'This will immediately alert emergency services and dispatch. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'SOS', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'SOS Activated',
              'Emergency services have been notified. Your location has been shared. Help is on the way.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const handleMenuPress = () => {
    // Drawer removed
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading emergency contacts...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load emergency data</Text>
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
          <Text style={styles.headerTitle}>Emergency</Text>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SOS Button */}
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
          <Ionicons name="warning" size={32} color="#fff" />
          <Text style={styles.sosText}>SOS EMERGENCY</Text>
          <Text style={styles.sosSubtext}>Tap for immediate help</Text>
        </TouchableOpacity>

        {/* Emergency Types */}
        <Text style={styles.sectionTitle}>Report Emergency</Text>
        <View style={styles.emergencyTypesGrid}>
          {emergencyTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.emergencyTypeCard, { borderLeftColor: type.color }]}
              onPress={() => handleEmergencyTypeSelect(type.id)}
            >
              <View style={styles.emergencyTypeHeader}>
                <MaterialCommunityIcons name={type.icon} size={24} color={type.color} />
                <View style={styles.emergencyTypeInfo}>
                  <Text style={styles.emergencyTypeTitle}>{type.title}</Text>
                  <Text style={styles.emergencyTypeDescription}>{type.description}</Text>
                </View>
                {type.urgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Contacts */}
        <Text style={styles.sectionTitle}>Quick Contacts</Text>
        <View style={styles.contactsList}>
          {quickContacts.map((contact, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactCard}
              onPress={() => handleCallContact(contact)}
            >
              <View style={[styles.contactIcon, { backgroundColor: contact.color + '20' }]}>
                <Ionicons name={contact.icon} size={24} color={contact.color} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
              </View>
              <Ionicons name="call" size={20} color="#f59e0b" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Safety Tips */}
        <Text style={styles.sectionTitle}>Safety Tips</Text>
        <View style={styles.safetyTipsCard}>
          <View style={styles.safetyTip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.safetyTipText}>Stay calm and assess the situation</Text>
          </View>
          <View style={styles.safetyTip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.safetyTipText}>Ensure passenger safety first</Text>
          </View>
          <View style={styles.safetyTip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.safetyTipText}>Report location and situation clearly</Text>
          </View>
          <View style={styles.safetyTip}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.safetyTipText}>Follow company emergency procedures</Text>
          </View>
        </View>
      </ScrollView>

      {/* Emergency Report Modal */}
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
            <Text style={styles.modalTitle}>Report Emergency</Text>
            <TouchableOpacity onPress={handleReportEmergency} disabled={isReporting}>
              <Text style={[styles.modalSave, isReporting && styles.disabledText]}>
                {isReporting ? 'Reporting...' : 'Report'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.emergencyTypeDisplay}>
              <Text style={styles.emergencyTypeLabel}>Emergency Type:</Text>
              <Text style={styles.emergencyTypeValue}>
                {emergencyTypes.find(t => t.id === emergencyType)?.title}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={styles.textArea}
                value={emergencyDescription}
                onChangeText={setEmergencyDescription}
                placeholder="Describe the emergency situation in detail..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.locationInfo}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>
                Your current location will be automatically included in the report
              </Text>
            </View>

            {isReporting && (
              <View style={styles.reportingIndicator}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.reportingText}>Submitting emergency report...</Text>
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
    backgroundColor: '#F44336',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    shadowColor: '#F44336',
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
  sosButton: {
    backgroundColor: '#F44336',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 15,
  },
  sosText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    fontFamily: 'System',
  },
  sosSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
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
  emergencyTypesGrid: {
    marginBottom: 25,
  },
  emergencyTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  emergencyTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTypeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
    fontFamily: 'System',
  },
  emergencyTypeDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  urgentBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  contactsList: {
    marginBottom: 25,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
    fontFamily: 'System',
  },
  contactNumber: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  safetyTipsCard: {
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
  safetyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  safetyTipText: {
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
    color: '#F44336',
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
  emergencyTypeDisplay: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  emergencyTypeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'System',
  },
  emergencyTypeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    fontFamily: 'System',
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 8,
    flex: 1,
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
