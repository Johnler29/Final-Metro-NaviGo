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
import { useSupabase } from '../contexts/SupabaseContext';
import { supabase } from '../lib/supabase';
import { validatePassword, getPasswordRequirements, DEFAULT_PASSWORD_OPTIONS } from '../utils/passwordValidation';
import PasswordRequirementsModal from '../components/PasswordRequirementsModal';

// Optional prop: onSwitchToDriver lets the user choose to log in as a driver instead of passenger
export default function LoginScreen({ onSwitchToDriver }) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();
  const { createUser } = useSupabase();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const data = await signIn(email.trim(), password);

      if (!data || !data.user) {
        Alert.alert('Login Error', 'Unable to log in. Please check your credentials.');
        return;
      }

      Alert.alert('Success', 'Logged in successfully!');
      // The app will automatically navigate to the main interface
      // because the AuthContext will detect the user is logged in
    } catch (error) {
      const message =
        error?.message?.includes('Invalid login credentials') ||
        error?.message?.includes('invalid login credentials')
          ? 'Invalid email or password. Please try again.'
          : error?.message || 'Login failed. Please try again.';
      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields (name, email, and password)');
      return;
    }

    // Validate password requirements
    const passwordValidation = validatePassword(password, DEFAULT_PASSWORD_OPTIONS);
    if (!passwordValidation.isValid) {
      setShowPasswordModal(true);
      return;
    }

    try {
      setLoading(true);

      // 1) Create Supabase Auth user
      const data = await signUp(email.trim(), password, {
        name: name.trim(),
      });

      if (!data) {
        Alert.alert('Sign Up Error', 'Unable to create account. Please try again.');
        return;
      }

      const authUser = data.user || data.session?.user;

      // 2) Create profile in public.users table (best-effort)
      if (authUser) {
        try {
          await createUser({
            id: authUser.id, // Must match auth.uid() for RLS
            name: name.trim() || 'Metro NaviGo User',
            email: authUser.email || email.trim(),
            phone: null,
            preferences: {},
          });
        } catch (profileError) {
          console.warn('Error creating user profile record:', profileError);
          // We don't block sign-up on profile creation; ping/feedback can still work
        }
      }

      Alert.alert(
        'Success',
        'Account created! Please check your email to verify your account before logging in.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      const message =
        error?.message?.includes('already registered') ||
        error?.message?.includes('already exists')
          ? 'An account with this email already exists. Try logging in instead.'
          : error?.message || 'Sign up failed. Please try again.';
      Alert.alert('Sign Up Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Check if email is already entered
    if (!email || !email.trim()) {
      Alert.alert(
        'Forgot Password',
        'Please enter your email address in the email field above, then tap "Forgot Password?" again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    // Confirm before sending
    Alert.alert(
      'Reset Password',
      `Send password reset link to ${email.trim()}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: () => sendPasswordReset(email.trim()),
        },
      ]
    );
  };

  const sendPasswordReset = async (emailAddress) => {
    try {
      setLoading(true);
      await resetPassword(emailAddress);
      
      Alert.alert(
        'Password Reset Email Sent',
        'Please check your email for a password reset link.\n\n' +
        'IMPORTANT: After clicking the link in your email:\n' +
        '1. The link will open in your browser (this is normal)\n' +
        '2. Open this app manually\n' +
        '3. The app will detect the reset request and show the password reset screen\n\n' +
        'If you don\'t see the email, check your spam folder.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      const message =
        error?.message?.includes('not found') ||
        error?.message?.includes('does not exist')
          ? 'No account found with this email address.'
          : error?.message || 'Failed to send password reset email. Please try again.';
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
            <Ionicons name="bus" size={52} color="#fff" />
          </View>
          <Text style={styles.title}>Metro NaviGo</Text>
          <Text style={styles.subtitle}>
            Sign in as a passenger or choose driver login
          </Text>
        </View>

        <View style={styles.form}>
          {isCreatingAccount && (
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
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
          {isCreatingAccount && (
            <TouchableOpacity onPress={() => setShowPasswordModal(true)}>
              <Text style={styles.passwordHint}>
                Password must: {getPasswordRequirements(DEFAULT_PASSWORD_OPTIONS)}
                {' '}
                <Text style={styles.passwordHintLink}>View details</Text>
              </Text>
            </TouchableOpacity>
          )}

          {!isCreatingAccount && (
            <>
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkResetButton}
                onPress={async () => {
                  // Check if there's an active recovery session
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                      // Check if we can update password (indicates recovery session)
                      Alert.alert(
                        'Password Reset',
                        'A password reset session was detected. You can now set your new password.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Reset Password', 
                            onPress: () => {
                              // Trigger the reset password screen
                              // This will be handled by AuthContext detecting the session
                              navigation?.navigate?.('ResetPassword');
                            }
                          }
                        ]
                      );
                    } else {
                      Alert.alert(
                        'No Reset Session',
                        'No password reset session found. Please request a password reset first.'
                      );
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Could not check reset session. Please try again.');
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.checkResetText}>Check for Password Reset</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={isCreatingAccount ? handleSignUp : handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={isCreatingAccount ? 'person-add' : 'log-in'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.buttonText}>
                  {isCreatingAccount ? 'Create Account' : 'Sign In'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {onSwitchToDriver && (
            <TouchableOpacity
              style={[styles.button, styles.driverButton]}
              onPress={onSwitchToDriver}
              disabled={loading}
            >
              <Ionicons
                name="car"
                size={20}
                color="#1F2933"
              />
              <Text style={styles.driverButtonText}>
                Driver login
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={() => setIsCreatingAccount((prev) => !prev)}
            disabled={loading}
          >
            <Ionicons
              name={isCreatingAccount ? 'log-in' : 'person-add'}
              size={20}
              color="#F59E0B"
            />
            <Text style={styles.signupButtonText}>
              {isCreatingAccount ? 'Back to Sign In' : 'Create Account'}
            </Text>
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
  loginButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  driverButton: {
    backgroundColor: '#E5E7EB',
    borderWidth: 0,
  },
  signupButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  driverButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  signupButtonText: {
    color: '#f59e0b',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  checkResetButton: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  checkResetText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
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
