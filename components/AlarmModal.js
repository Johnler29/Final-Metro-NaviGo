import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';

const AlarmModal = ({ visible, onClose, userType = 'passenger', driverId = null, busId = null }) => {
  const [selectedType, setSelectedType] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const { reportEmergency } = useSupabase();

  const alarmTypes = [
    {
      id: 'emergency',
      title: 'Emergency',
      description: 'Medical emergency, accident, or safety threat',
      icon: 'warning',
      color: '#EF4444',
      priority: 'high'
    },
    {
      id: 'mechanical',
      title: 'Mechanical Issue',
      description: 'Bus breakdown, engine problems, or equipment failure',
      icon: 'construct',
      color: '#F59E0B',
      priority: 'high'
    },
    {
      id: 'safety',
      title: 'Safety Concern',
      description: 'Suspicious activity, harassment, or security issue',
      icon: 'shield-checkmark',
      color: '#8B5CF6',
      priority: 'high'
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      description: 'General maintenance needs or cleanliness issues',
      icon: 'hammer',
      color: '#10B981',
      priority: 'medium'
    },
    {
      id: 'other',
      title: 'Other',
      description: 'Any other issue or concern',
      icon: 'help-circle',
      color: '#6B7280',
      priority: 'low'
    }
  ];

  const handleSendAlarm = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an alarm type');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    setLoading(true);
    try {
      const alarmData = {
        type: selectedType,
        message: message.trim(),
        priority: priority,
        timestamp: new Date().toISOString(),
        userType: userType
      };

      if (userType === 'driver' && driverId) {
        // Driver reporting emergency
        await reportEmergency(driverId, {
          type: selectedType,
          description: message.trim(),
          priority: priority,
          busId: busId,
          location: null // Will be filled by the backend
        });
        
        Alert.alert(
          'Alarm Sent',
          'Your emergency report has been sent to the control center.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else if (userType === 'passenger') {
        Alert.alert(
          'Unavailable',
          'Passenger alarm notifications are no longer supported.'
        );
        onClose();
      }

      // Reset form
      setSelectedType('');
      setMessage('');
      setPriority('medium');
    } catch (error) {
      console.error('Error sending alarm:', error);
      Alert.alert('Error', 'Failed to send alarm. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedType('');
    setMessage('');
    setPriority('medium');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={styles.title}>Send Alarm</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              {userType === 'driver' 
                ? 'Report an emergency or issue to the control center'
                : 'Send an alarm to the driver and control center'
              }
            </Text>

            {/* Alarm Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Alarm Type</Text>
              {alarmTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    selectedType === type.id && styles.typeButtonSelected,
                    { borderColor: type.color }
                  ]}
                  onPress={() => {
                    setSelectedType(type.id);
                    setPriority(type.priority);
                  }}
                >
                  <View style={styles.typeButtonContent}>
                    <View style={[styles.typeIcon, { backgroundColor: type.color }]}>
                      <Ionicons name={type.icon} size={20} color="#fff" />
                    </View>
                    <View style={styles.typeText}>
                      <Text style={[
                        styles.typeTitle,
                        selectedType === type.id && { color: type.color }
                      ]}>
                        {type.title}
                      </Text>
                      <Text style={styles.typeDescription}>{type.description}</Text>
                    </View>
                    {selectedType === type.id && (
                      <Ionicons name="checkmark-circle" size={24} color={type.color} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Message Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Describe the issue or emergency..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>{message.length}/500</Text>
            </View>

            {/* Priority Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Priority Level</Text>
              <View style={styles.priorityContainer}>
                {[
                  { id: 'low', label: 'Low', color: '#10B981' },
                  { id: 'medium', label: 'Medium', color: '#F59E0B' },
                  { id: 'high', label: 'High', color: '#EF4444' }
                ].map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.priorityButton,
                      priority === p.id && styles.priorityButtonSelected,
                      { borderColor: p.color }
                    ]}
                    onPress={() => setPriority(p.id)}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                    <Text style={[
                      styles.priorityText,
                      priority === p.id && { color: p.color, fontWeight: '600' }
                    ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleSendAlarm}
              disabled={loading || !selectedType || !message.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Alarm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  typeButton: {
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    backgroundColor: '#FEF3F2',
  },
  typeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeText: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  priorityButtonSelected: {
    backgroundColor: '#FEF3F2',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AlarmModal;
