import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationModal from '../components/NotificationModal';

export default function SettingsScreen({ navigation }) {
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    icon: null,
    type: 'info',
  });

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handlePushNotifications = () => {
    setModalState({
      visible: true,
      title: 'Push Notifications',
      message: 'Push notifications are currently enabled. You will receive alerts about bus arrivals, route updates, and important announcements.',
      icon: 'notifications',
      type: 'info',
    });
  };

  const handleLocationServices = () => {
    setModalState({
      visible: true,
      title: 'Location Services',
      message: 'Location services are enabled. This allows the app to show your current location on the map and provide accurate bus arrival times based on your position.',
      icon: 'location',
      type: 'info',
    });
  };

  const handleLanguage = () => {
    setModalState({
      visible: true,
      title: 'Language',
      message: 'The app is currently set to English. Language selection feature will be available in a future update.',
      icon: 'language',
      type: 'info',
    });
  };

  const closeModal = () => {
    setModalState({
      visible: false,
      title: '',
      message: '',
      icon: null,
      type: 'info',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handlePushNotifications}>
            <Ionicons name="notifications" size={24} color="#666" />
            <Text style={styles.settingText}>Push Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLocationServices}>
            <Ionicons name="location" size={24} color="#666" />
            <Text style={styles.settingText}>Location Services</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLanguage}>
            <Ionicons name="language" size={24} color="#666" />
            <Text style={styles.settingText}>Language</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
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

      {/* Settings Modal */}
      <NotificationModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.icon}
        type={modalState.type}
        onPress={closeModal}
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
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
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
    width: 44,
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
}); 