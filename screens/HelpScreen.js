import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationModal from '../components/NotificationModal';

export default function HelpScreen({ navigation }) {
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    icon: null,
    type: 'info',
  });

  const helpItems = [
    {
      title: 'How to track buses',
      icon: 'bus',
      modalTitle: 'Track Buses',
      modalMessage: 'Use the map screen to see real-time bus locations. Tap on a bus marker for more details.',
      modalIcon: 'bus',
      type: 'info',
    },
    {
      title: 'Find routes',
      icon: 'search',
      modalTitle: 'Find Routes',
      modalMessage: 'Use the Route Search screen to find bus routes between locations.',
      modalIcon: 'search',
      type: 'info',
    },
    {
      title: 'Switch to bus conductor mode',
      icon: 'car',
      modalTitle: 'Bus Conductor Mode',
      modalMessage: 'Use the menu drawer to switch between passenger and bus conductor modes.',
      modalIcon: 'car',
      type: 'info',
    },
    {
      title: 'Contact support',
      icon: 'call',
      modalTitle: 'Contact Support',
      modalMessage: 'Email: support@metronavigo.com\nPhone: +1-234-567-8900',
      modalIcon: 'call',
      type: 'info',
    },
  ];

  const handleHelpItemPress = (item) => {
    setModalState({
      visible: true,
      title: item.modalTitle,
      message: item.modalMessage,
      icon: item.modalIcon,
      type: item.type,
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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.welcomeText}>
          Need help? Here are some common questions and answers.
        </Text>
        
        {helpItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.helpItem}
            onPress={() => handleHelpItemPress(item)}
          >
            <View style={styles.helpContent}>
              <Ionicons name={item.icon} size={24} color="#f59e0b" />
              <Text style={styles.helpText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Help Modal */}
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
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -0.8,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'System',
    fontWeight: '600',
    lineHeight: 24,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
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
  helpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 16,
    fontFamily: 'System',
    fontWeight: '600',
    flex: 1,
  },
}); 