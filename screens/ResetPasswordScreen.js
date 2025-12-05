import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword, getPasswordRequirements, DEFAULT_PASSWORD_OPTIONS } from '../utils/passwordValidation';
import PasswordRequirementsModal from '../components/PasswordRequirementsModal';

export default function ResetPasswordScreen({ navigation, route }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { updatePassword, setShowResetPassword, signOut } = useAuth();

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate password requirements
    const passwordValidation = validatePassword(password, DEFAULT_PASSWORD_OPTIONS);
    if (!passwordValidation.isValid) {
      setShowPasswordModal(true);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      
      // Update password using AuthContext
      // This will also clear the recovery session
      await updatePassword(password);

      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now log in with your new password.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Sign out to clear the recovery session
              try {
                await signOut();
              } catch (e) {
                console.warn('Error signing out after password reset:', e);
              }
              
              // Clear reset password flag and navigate back to login
              if (setShowResetPassword) {
                setShowResetPassword(false);
              }
              if (navigation) {
                navigation.navigate('Login');
              }
            },
          },
        ]
      );
    } catch (error) {
      const message =
        error?.message?.includes('session') || error?.message?.includes('token')
          ? 'The password reset link has expired or is invalid. Please request a new password reset.'
          : error?.message || 'Failed to reset password. Please try again.';
      Alert.alert('Error', message);
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
          <View style={styles.logoContainer}>
            <Ionicons name="lock-closed" size={52} color="#fff" />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New Password"
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
          <TouchableOpacity onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.passwordHint}>
              Password must: {getPasswordRequirements(DEFAULT_PASSWORD_OPTIONS)}
              {' '}
              <Text style={styles.passwordHintLink}>View details</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Reset Password</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation) {
                navigation.navigate('Login');
              }
            }}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Requirements Modal */}
      <PasswordRequirementsModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        password={password}
        options={DEFAULT_PASSWORD_OPTIONS}
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
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: -1,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'System',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
    paddingHorizontal: 24,
    height: 64,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
    paddingVertical: 16,
    borderRadius: 24,
    marginBottom: 16,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  resetButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  passwordHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
    fontFamily: 'System',
  },
  passwordHintLink: {
    color: '#F59E0B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

