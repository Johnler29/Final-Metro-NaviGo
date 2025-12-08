import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';
import NotificationModal from '../components/NotificationModal';

export default function DriverLoginScreen({ navigation, onLoginSuccess, onBackToPassenger }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: null,
    type: 'default',
    icon: null,
  });

  const { authenticateDriver } = useSupabase();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await authenticateDriver(email, password);
      
      // Check if result is an array and has at least one element
      if (result && Array.isArray(result) && result.length > 0 && result[0].driver_id) {
        const driverData = result[0];
        
        // Store driver session in AsyncStorage
        try {
          await AsyncStorage.setItem('driverSession', JSON.stringify({
            driver_id: driverData.driver_id,
            email: driverData.email,
            name: `${driverData.first_name} ${driverData.last_name}`,
            license_number: driverData.license_number,
            status: driverData.driver_status,
            is_active: driverData.is_active
          }));

          // Whenever a driver logs in, start from a clean "off duty" state.
          // Clear any previous active trip so the app doesn't auto-set On Duty.
          await AsyncStorage.removeItem('currentTrip');

          console.log('✅ Driver session stored and previous trip cleared:', driverData);
        } catch (storageError) {
          console.error('Error storing driver session or clearing trip:', storageError);
        }
        
        setNotificationModal({
          visible: true,
          title: 'Success',
          message: 'Login successful!',
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null });
                // Call the success callback to update authentication state
                if (onLoginSuccess) {
                  onLoginSuccess();
                }
              }
            }
          ],
          type: 'success',
          icon: 'checkmark-circle',
        });
      } else {
        setNotificationModal({
          visible: true,
          title: 'Error',
          message: 'Invalid credentials. Please try again.',
          buttons: null,
          type: 'error',
          icon: 'alert-circle',
        });
      }
    } catch (error) {
      console.error('Login error details:', error);
      
      let message = 'Login failed. Please try again.';
      
      // Handle different error types
      if (error?.message) {
        if (error.message.includes('Invalid credentials') || 
            error.message.includes('Invalid login credentials')) {
          message = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('JSON Parse error') || 
                   error.message.includes('Unexpected character')) {
          message = 'Connection error. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed') ||
                   error.message.includes('Failed to fetch')) {
          message = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('not found') ||
                   error.message.includes('does not exist')) {
          message = 'No bus conductor account found with this email.';
        } else {
          message = error.message;
        }
      } else if (error?.error_description) {
        message = error.error_description;
      } else if (typeof error === 'string') {
        message = error;
      }
      
      setNotificationModal({
        visible: true,
        title: 'Login Error',
        message: message,
        buttons: null,
        type: 'error',
        icon: 'alert-circle',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (onBackToPassenger) {
                onBackToPassenger();
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#F59E0B" />
            <Text style={styles.backButtonText}>Back to Passenger</Text>
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Ionicons name="bus" size={52} color="#fff" />
          </View>
          <Text style={styles.title}>NaviGO Bus Conductor</Text>
          <Text style={styles.subtitle}>Bus Conductor Login</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Bus Conductor Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#fff" />
                <Text style={styles.buttonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

        </View>

      </View>

      {/* Notification Modal */}
      <NotificationModal
        visible={notificationModal.visible}
        title={notificationModal.title}
        message={notificationModal.message}
        buttons={notificationModal.buttons}
        type={notificationModal.type}
        icon={notificationModal.icon}
        onPress={() => setNotificationModal({ visible: false, title: '', message: '', buttons: null, type: 'default', icon: null })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 32,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    color: '#F59E0B',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
    fontFamily: 'System',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'System',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
    height: 64,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  inputIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    fontFamily: 'System',
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 24,
    marginBottom: 16,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  loginButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: 'System',
  },
});
