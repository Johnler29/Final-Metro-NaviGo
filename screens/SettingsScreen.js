import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';
import { testDatabaseConnection } from '../lib/supabase';

export default function SettingsScreen({ navigation }) {
  const { connectionStatus, error, refreshData, buses, routes, drivers, feedback } = useSupabase();
  const [testingConnection, setTestingConnection] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState('');

  const handleMenuPress = () => {
    navigation.getParent()?.openDrawer();
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testDatabaseConnection();
      if (result.success) {
        Alert.alert('✅ Success', 'Database connection is working properly!');
      } else {
        Alert.alert('❌ Error', `Database connection failed: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('❌ Error', `Test failed: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const viewData = (dataType) => {
    setSelectedDataType(dataType);
    setShowDataModal(true);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'testing':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'failed':
        return 'Failed';
      case 'testing':
        return 'Testing';
      default:
        return 'Unknown';
    }
  };

  const getDataCount = (dataType) => {
    switch (dataType) {
      case 'buses':
        return buses.length;
      case 'routes':
        return routes.length;
      case 'drivers':
        return drivers.length;
      case 'feedback':
        return feedback.length;
      default:
        return 0;
    }
  };

  const renderDataModal = () => (
    <Modal
      visible={showDataModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDataModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDataType.charAt(0).toUpperCase() + selectedDataType.slice(1)} Data
            </Text>
            <TouchableOpacity onPress={() => setShowDataModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {selectedDataType === 'buses' && buses.map((bus, index) => (
              <View key={bus.id || index} style={styles.dataItem}>
                <Text style={styles.dataItemTitle}>Bus {bus.bus_number || bus.id}</Text>
                <Text style={styles.dataItemText}>Route: {bus.route_id}</Text>
                <Text style={styles.dataItemText}>Status: {bus.status}</Text>
              </View>
            ))}
            
            {selectedDataType === 'routes' && routes.map((route, index) => (
              <View key={route.id || index} style={styles.dataItem}>
                <Text style={styles.dataItemTitle}>Route {route.route_number}</Text>
                <Text style={styles.dataItemText}>From: {route.origin}</Text>
                <Text style={styles.dataItemText}>To: {route.destination}</Text>
              </View>
            ))}
            
            {selectedDataType === 'drivers' && drivers.map((driver, index) => (
              <View key={driver.id || index} style={styles.dataItem}>
                <Text style={styles.dataItemTitle}>{driver.name}</Text>
                <Text style={styles.dataItemText}>License: {driver.license_number}</Text>
                <Text style={styles.dataItemText}>Status: {driver.status}</Text>
              </View>
            ))}

            {selectedDataType === 'feedback' && feedback.map((item, index) => (
              <View key={item.id || index} style={styles.dataItem}>
                <Text style={styles.dataItemTitle}>Feedback {item.id}</Text>
                <Text style={styles.dataItemText}>Type: {item.feedback_type}</Text>
                <Text style={styles.dataItemText}>Message: {item.message}</Text>
                <Text style={styles.dataItemText}>Submitted by: {item.user_id}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Database Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons name="server" size={24} color={getConnectionStatusColor()} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Supabase Connection</Text>
                <Text style={[styles.statusValue, { color: getConnectionStatusColor() }]}>
                  {getConnectionStatusText()}
                </Text>
              </View>
            </View>
            {error && (
              <Text style={styles.errorText}>Error: {error}</Text>
            )}
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={testConnection}
              disabled={testingConnection}
            >
              <Text style={styles.testButtonText}>
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* View Submitted Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>View Submitted Data</Text>
          <View style={styles.dataCard}>
            <Text style={styles.dataCardText}>
              Check your submitted feedback and other data from the database.
            </Text>
            <View style={styles.dataButtons}>
              <TouchableOpacity 
                style={styles.dataButton} 
                onPress={() => viewData('buses')}
              >
                <Ionicons name="bus" size={20} color="#f59e0b" />
                <Text style={styles.dataButtonText}>Buses ({getDataCount('buses')})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dataButton} 
                onPress={() => viewData('routes')}
              >
                <Ionicons name="map" size={20} color="#f59e0b" />
                <Text style={styles.dataButtonText}>Routes ({getDataCount('routes')})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dataButton} 
                onPress={() => viewData('drivers')}
              >
                <Ionicons name="person" size={20} color="#f59e0b" />
                <Text style={styles.dataButtonText}>Drivers ({getDataCount('drivers')})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dataButton} 
                onPress={() => viewData('feedback')}
              >
                <Ionicons name="chatbubble" size={20} color="#f59e0b" />
                <Text style={styles.dataButtonText}>Feedback ({getDataCount('feedback')})</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.supabaseButton} 
              onPress={() => Alert.alert(
                'Supabase Dashboard', 
                'To view all data including feedback:\n\n1. Go to https://supabase.com/dashboard\n2. Sign in to your account\n3. Select your project\n4. Click "Table Editor"\n5. Check the "feedback" table for your submissions'
              )}
            >
              <Text style={styles.supabaseButtonText}>Open Supabase Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.settingItem}>
            <Ionicons name="notifications" size={24} color="#666" />
            <Text style={styles.settingText}>Push Notifications</Text>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
          <View style={styles.settingItem}>
            <Ionicons name="location" size={24} color="#666" />
            <Text style={styles.settingText}>Location Services</Text>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
          <View style={styles.settingItem}>
            <Ionicons name="language" size={24} color="#666" />
            <Text style={styles.settingText}>Language</Text>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.appName}>Metro NaviGo</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
            <Text style={styles.description}>
              Metro NaviGo is a comprehensive bus tracking and navigation app designed to enhance your public transportation experience.
            </Text>
          </View>
        </View>
      </ScrollView>

      {renderDataModal()}
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
  menuButton: {
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 8,
    fontFamily: 'System',
  },
  testButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontFamily: 'System',
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
    fontFamily: 'System',
  },
  version: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'System',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: 'System',
  },
  dataCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    marginTop: 15,
  },
  dataCardText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    fontFamily: 'System',
  },
  dataButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5e6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffe4b3',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  dataButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    fontFamily: 'System',
  },
  supabaseButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  supabaseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 32,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'System',
  },
  modalBody: {
    padding: 16,
  },
  dataItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  dataItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
    fontFamily: 'System',
  },
  dataItemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'System',
  },
}); 