import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/uiTheme';

const { width } = Dimensions.get('window');

const CapacityStatusModal = ({ 
  visible, 
  onClose, 
  currentCapacity = 0, 
  onUpdateCapacity,
  busId,
  busInfo 
}) => {
  const [capacity, setCapacity] = useState(currentCapacity);
  const [pwdPassengers, setPwdPassengers] = useState(busInfo?.current_pwd_passengers || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    setCapacity(currentCapacity);
  }, [currentCapacity]);

  useEffect(() => {
    setPwdPassengers(busInfo?.current_pwd_passengers || 0);
  }, [busInfo?.current_pwd_passengers]);

  // Reset animations when modal closes
  useEffect(() => {
    if (!visible && !showSuccessModal) {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      setShowSuccessModal(false);
    }
  }, [visible, showSuccessModal]);

  // PanResponder for slider interaction
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      // Handle touch start
    },
    onPanResponderMove: (evt, gestureState) => {
      if (sliderWidth > 0) {
        const newCapacity = Math.max(0, Math.min(100, (gestureState.moveX / sliderWidth) * 100));
        setCapacity(Math.round(newCapacity));
      }
    },
    onPanResponderRelease: () => {
      // Handle touch end
    },
  });

  const handleUpdateCapacity = async () => {
    if (isUpdating) return;
    
    // Validate busId before attempting update
    if (!busId) {
      Alert.alert('Error', 'Bus ID is missing. Please ensure you are assigned to a bus.');
      return;
    }
    
    // Validate PWD passengers don't exceed available seats
    const maxPwdSeats = busInfo?.pwd_seats || 4;
    if (pwdPassengers > maxPwdSeats) {
      Alert.alert('Error', `PWD passengers cannot exceed ${maxPwdSeats} (total PWD seats available).`);
      return;
    }
    
    setIsUpdating(true);
    try {
      await onUpdateCapacity(busId, capacity, pwdPassengers);
      // Show success modal with animation
      setShowSuccessModal(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error updating capacity:', error);
      // Show more specific error message if available
      const errorMessage = error?.message || 'Failed to update bus capacity. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuccessClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessModal(false);
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      onClose();
    });
  };

  const getCapacityColor = (percentage) => {
    if (percentage < 25) return '#4CAF50'; // Green
    if (percentage < 50) return '#FFC107'; // Yellow
    if (percentage < 75) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getCapacityStatus = (percentage) => {
    if (percentage < 25) return 'Low';
    if (percentage < 50) return 'Moderate';
    if (percentage < 75) return 'High';
    return 'Full';
  };

  const getCapacityIcon = (percentage) => {
    if (percentage < 25) return 'checkmark-circle';
    if (percentage < 50) return 'information-circle';
    if (percentage < 75) return 'warning';
    return 'alert-circle';
  };

  return (
    <>
      <Modal
        visible={visible && !showSuccessModal}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Bus Capacity Status</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {busInfo && (
            <View style={styles.busInfo}>
              <Text style={styles.busPlate}>{busInfo.plate_number}</Text>
              <Text style={styles.busModel}>{busInfo.model}</Text>
            </View>
          )}

          <View style={styles.capacityContainer}>
            <View style={styles.capacityHeader}>
              <Ionicons 
                name={getCapacityIcon(capacity)} 
                size={24} 
                color={getCapacityColor(capacity)} 
              />
              <Text style={[styles.capacityPercentage, { color: getCapacityColor(capacity) }]}>
                {Math.round(capacity)}%
              </Text>
              <Text style={styles.capacityStatus}>
                {getCapacityStatus(capacity)}
              </Text>
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Adjust Capacity</Text>
              
              {/* Custom Slider */}
              <View style={styles.customSlider}>
                <View 
                  style={styles.sliderTrack}
                  onLayout={(event) => {
                    const { width } = event.nativeEvent.layout;
                    setSliderWidth(width);
                  }}
                  {...panResponder.panHandlers}
                >
                  <View 
                    style={[
                      styles.sliderFill, 
                      { 
                        width: `${capacity}%`,
                        backgroundColor: getCapacityColor(capacity)
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.sliderThumb,
                      { left: `${capacity}%` }
                    ]}
                  />
                </View>
                
                {/* Quick adjustment buttons */}
                <View style={styles.quickButtons}>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => setCapacity(Math.max(0, capacity - 10))}
                  >
                    <Text style={styles.quickButtonText}>-10%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => setCapacity(Math.min(100, capacity + 10))}
                  >
                    <Text style={styles.quickButtonText}>+10%</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Preset buttons */}
                <View style={styles.presetButtons}>
                  <TouchableOpacity 
                    style={[styles.presetButton, capacity === 0 && styles.presetButtonActive]}
                    onPress={() => setCapacity(0)}
                  >
                    <Text style={[styles.presetButtonText, capacity === 0 && styles.presetButtonTextActive]}>Empty</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.presetButton, capacity === 25 && styles.presetButtonActive]}
                    onPress={() => setCapacity(25)}
                  >
                    <Text style={[styles.presetButtonText, capacity === 25 && styles.presetButtonTextActive]}>25%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.presetButton, capacity === 50 && styles.presetButtonActive]}
                    onPress={() => setCapacity(50)}
                  >
                    <Text style={[styles.presetButtonText, capacity === 50 && styles.presetButtonTextActive]}>50%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.presetButton, capacity === 75 && styles.presetButtonActive]}
                    onPress={() => setCapacity(75)}
                  >
                    <Text style={[styles.presetButtonText, capacity === 75 && styles.presetButtonTextActive]}>75%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.presetButton, capacity === 100 && styles.presetButtonActive]}
                    onPress={() => setCapacity(100)}
                  >
                    <Text style={[styles.presetButtonText, capacity === 100 && styles.presetButtonTextActive]}>Full</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>0%</Text>
                <Text style={styles.sliderLabelText}>25%</Text>
                <Text style={styles.sliderLabelText}>50%</Text>
                <Text style={styles.sliderLabelText}>75%</Text>
                <Text style={styles.sliderLabelText}>100%</Text>
              </View>
            </View>

            <View style={styles.capacityBar}>
              <View style={styles.capacityBarBackground}>
                <View 
                  style={[
                    styles.capacityBarFill, 
                    { 
                      width: `${capacity}%`,
                      backgroundColor: getCapacityColor(capacity)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.capacityBarText}>
                {Math.round(capacity)}% capacity
              </Text>
            </View>

            <View style={styles.passengerCount}>
              <Text style={styles.passengerCountText}>
                Estimated Passengers: {Math.round((capacity / 100) * (busInfo?.capacity || 50))}
              </Text>
              <Text style={styles.maxCapacityText}>
                (Max Capacity: {busInfo?.capacity || 50})
              </Text>
            </View>

            {/* PWD Indicator */}
            <View style={styles.pwdIndicator}>
              <View style={styles.pwdHeader}>
                <Ionicons name="accessibility" size={20} color="#3B82F6" />
                <Text style={styles.pwdTitle}>PWD Passengers</Text>
              </View>
              
              <View style={styles.pwdControls}>
                <View style={styles.pwdInfoRow}>
                  <Text style={styles.pwdLabel}>Current PWD:</Text>
                  <Text style={styles.pwdValue}>
                    {pwdPassengers}
                  </Text>
                </View>
                
                {/* PWD Adjustment Buttons */}
                <View style={styles.pwdAdjustmentButtons}>
                  <TouchableOpacity
                    style={[styles.pwdAdjustButton, pwdPassengers === 0 && styles.pwdAdjustButtonDisabled]}
                    onPress={() => setPwdPassengers(Math.max(0, pwdPassengers - 1))}
                    disabled={pwdPassengers === 0}
                  >
                    <Ionicons name="remove" size={20} color={pwdPassengers === 0 ? "#9CA3AF" : "#3B82F6"} />
                  </TouchableOpacity>
                  
                  <View style={styles.pwdCountDisplay}>
                    <Text style={styles.pwdCountText}>{pwdPassengers}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.pwdAdjustButton,
                      pwdPassengers >= (busInfo?.pwd_seats || 4) && styles.pwdAdjustButtonDisabled
                    ]}
                    onPress={() => {
                      const maxPwdSeats = busInfo?.pwd_seats || 4;
                      setPwdPassengers(Math.min(maxPwdSeats, pwdPassengers + 1));
                    }}
                    disabled={pwdPassengers >= (busInfo?.pwd_seats || 4)}
                  >
                    <Ionicons 
                      name="add" 
                      size={20} 
                      color={pwdPassengers >= (busInfo?.pwd_seats || 4) ? "#9CA3AF" : "#3B82F6"} 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.pwdInfoRow}>
                  <Text style={styles.pwdLabel}>Available Seats:</Text>
                  <Text style={[styles.pwdValue, styles.pwdValueAvailable]}>
                    {(busInfo?.pwd_seats || 4) - pwdPassengers}
                    {' / '}
                    {busInfo?.pwd_seats || 4}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]} 
              onPress={handleUpdateCapacity}
              disabled={isUpdating}
            >
              <Text style={styles.updateButtonText}>
                {isUpdating ? 'Updating...' : 'Update Capacity'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <Animated.View 
          style={[
            styles.successOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <Animated.View
            style={[
              styles.successModalContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={48} color="#FFFFFF" />
              </View>
            </View>

            {/* Success Title */}
            <Text style={styles.successTitle}>Success!</Text>

            {/* Success Message */}
            <Text style={styles.successMessage}>
              Bus capacity updated successfully!
            </Text>

            {/* Success Button */}
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessClose}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>Got it</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  busPlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  busModel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  capacityContainer: {
    marginBottom: 20,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  capacityPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  capacityStatus: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  customSlider: {
    marginBottom: 10,
  },
  sliderTrack: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    position: 'relative',
    marginBottom: 15,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 10,
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 30,
    height: 30,
    backgroundColor: '#2196F3',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    transform: [{ translateX: -15 }],
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  quickButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    flexWrap: 'wrap',
  },
  presetButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 50,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  presetButtonTextActive: {
    color: 'white',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#666',
  },
  capacityBar: {
    marginBottom: 15,
  },
  capacityBarBackground: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  capacityBarText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  passengerCount: {
    alignItems: 'center',
  },
  passengerCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  maxCapacityText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pwdIndicator: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pwdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pwdTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  pwdControls: {
    gap: 12,
  },
  pwdAdjustmentButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 8,
  },
  pwdAdjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pwdAdjustButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  pwdCountDisplay: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pwdCountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E40AF',
  },
  pwdInfo: {
    gap: 8,
  },
  pwdInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pwdLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  pwdValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  pwdValueAvailable: {
    color: '#059669',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
    padding: 15,
    marginLeft: 10,
    borderRadius: 10,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  updateButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  // Success Modal Styles - Consistent with NotificationModal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    width: Math.min(width - 40, 340),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brand,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  successMessage: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  successButton: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    minWidth: 120,
    minHeight: 48,
    shadowColor: colors.brand,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default CapacityStatusModal;
