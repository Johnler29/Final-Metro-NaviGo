import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';
import * as Location from 'expo-location';

const PING_TYPES = [
  { value: 'ride_request', label: 'Request Pickup', icon: 'car-outline' },
  { value: 'eta_request', label: 'Ask for ETA', icon: 'time-outline' },
  { value: 'location_request', label: 'Request Location', icon: 'location-outline' },
  { value: 'general_message', label: 'General Message', icon: 'chatbubble-outline' },
];

export default function PingModal({ visible, onClose, busId, busNumber, routeNumber }) {
  const { pingBus, getUserPingStatus } = useSupabase();
  const [selectedType, setSelectedType] = useState('ride_request');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [useLocation, setUseLocation] = useState(true);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (visible) {
      loadPingStatus();
      if (useLocation) {
        getCurrentLocation();
      }
    } else {
      setMessage('');
      setSelectedType('ride_request');
      setCooldownTimer(0);
    }
  }, [visible]);

  useEffect(() => {
    let interval = null;
    if (cooldownTimer > 0) {
      interval = setInterval(() => {
        setCooldownTimer((prev) => {
          if (prev <= 1) {
            loadPingStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownTimer]);

  const loadPingStatus = async () => {
    try {
      const status = await getUserPingStatus();
      setPingStatus(status);
      
      if (status.cooldown_remaining > 0) {
        setCooldownTimer(status.cooldown_remaining);
      }
    } catch (error) {
      console.error('Error loading ping status:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUseLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setUseLocation(false);
    }
  };

  const handleSendPing = async () => {
    if (!busId) {
      Alert.alert('Error', 'No bus selected');
      return;
    }

    if (cooldownTimer > 0) {
      Alert.alert(
        'Cooldown Active',
        `Please wait ${cooldownTimer} seconds before sending another ping.`
      );
      return;
    }

    if (pingStatus && !pingStatus.can_ping) {
      if (pingStatus.is_blocked) {
        const blockedUntil = pingStatus.blocked_until
          ? new Date(pingStatus.blocked_until).toLocaleString()
          : 'later';
        Alert.alert(
          'Blocked',
          `You are temporarily blocked from sending pings. Please try again ${blockedUntil}.`
        );
      } else {
        Alert.alert('Cannot Send Ping', pingStatus.message || 'You cannot send a ping at this time.');
      }
      return;
    }

    setIsLoading(true);
    try {
      const result = await pingBus(
        busId,
        selectedType,
        message.trim(),
        useLocation && location ? location : null
      );

      if (result.success) {
        Alert.alert(
          'Success!',
          result.message || 'Ping sent successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setMessage('');
                loadPingStatus();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send ping');
        
        // Update cooldown if provided
        if (result.cooldown_remaining) {
          setCooldownTimer(result.cooldown_remaining);
        }
        
        // Reload status
        loadPingStatus();
      }
    } catch (error) {
      console.error('Error sending ping:', error);
      Alert.alert('Error', error.message || 'Failed to send ping');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCooldown = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Send Ping to Bus</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {busNumber && (
            <View style={styles.busInfo}>
              <Ionicons name="bus" size={20} color="#007AFF" />
              <Text style={styles.busInfoText}>
                Bus {busNumber} {routeNumber ? `- Route ${routeNumber}` : ''}
              </Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Ping Status */}
            {pingStatus && (
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Ionicons
                    name={pingStatus.can_ping ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={pingStatus.can_ping ? '#4CAF50' : '#F44336'}
                  />
                  <Text style={styles.statusText}>
                    {pingStatus.can_ping
                      ? `You can send a ping (${pingStatus.pings_remaining || 50} remaining today)`
                      : pingStatus.is_blocked
                      ? 'You are temporarily blocked'
                      : 'Please wait before sending another ping'}
                  </Text>
                </View>
                {cooldownTimer > 0 && (
                  <Text style={styles.cooldownText}>
                    Cooldown: {formatCooldown(cooldownTimer)}
                  </Text>
                )}
              </View>
            )}

            {/* Ping Type Selection */}
            <Text style={styles.label}>Ping Type</Text>
            <View style={styles.typeContainer}>
              {PING_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    selectedType === type.value && styles.typeButtonSelected,
                  ]}
                  onPress={() => setSelectedType(type.value)}
                >
                  <Ionicons
                    name={type.icon}
                    size={20}
                    color={selectedType === type.value ? '#007AFF' : '#666'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedType === type.value && styles.typeButtonTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Message Input */}
            <Text style={styles.label}>Message (Optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Add a message to the driver..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
            <Text style={styles.charCount}>{message.length}/200</Text>

            {/* Location Toggle */}
            <View style={styles.locationToggle}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setUseLocation(!useLocation)}
              >
                <Ionicons
                  name={useLocation ? 'location' : 'location-outline'}
                  size={20}
                  color={useLocation ? '#007AFF' : '#666'}
                />
                <Text style={styles.toggleText}>Include my location</Text>
              </TouchableOpacity>
              {useLocation && location && (
                <Text style={styles.locationText}>
                  Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                (!pingStatus?.can_ping || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendPing}
              disabled={!pingStatus?.can_ping || isLoading || cooldownTimer > 0}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFF" />
                  <Text style={styles.sendButtonText}>Send Ping</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
  },
  busInfoText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  statusContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  cooldownText: {
    marginTop: 4,
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  typeButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  typeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 5,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 20,
  },
  locationToggle: {
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  locationText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

