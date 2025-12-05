// import 'react-native-reanimated'; // Removed - not needed
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { colors, radius } from './styles/uiTheme';

// Import screens
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import BusListScreen from './screens/BusListScreen';
import RouteScreen from './screens/RouteScreen';
import LoginScreen from './screens/LoginScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';

// Import driver screens
import DriverLoginScreen from './screens/DriverLoginScreen';
import DriverHomeScreen from './screens/DriverHomeScreen';
import DriverMapScreen from './screens/DriverMapScreen';
import DriverScheduleScreen from './screens/DriverScheduleScreen';
import DriverProfileScreen from './screens/DriverProfileScreen';
import DriverEmergencyScreen from './screens/DriverEmergencyScreen';
import DriverNotificationsScreen from './screens/DriverNotificationsScreen';
import DriverAnalyticsScreen from './screens/DriverAnalyticsScreen';
import DriverMaintenanceScreen from './screens/DriverMaintenanceScreen';

// Import additional screens
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';
import ProfileScreen from './screens/ProfileScreen';

// Import contexts
import { SupabaseProvider } from './contexts/SupabaseContext';
import { restoreDriverBackgroundTrackingIfNeeded } from './background/driverBackgroundTasks';

// Import background task to ensure it's registered at app startup
// This ensures TaskManager.defineTask is called before any location updates start
import './background/driverBackgroundTasks';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Temporary test harness flag to safely isolate crashes
const TEST_MODE = false; // Set to false to run full app

function AppTestHarness() {
  const [step, setStep] = useState(0);

  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null, info: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    componentDidCatch(error, info) {
      this.setState({ info });
      console.error('Test Harness ErrorBoundary:', error, info);
    }
    render() {
      if (this.state.hasError) {
        return (
          <View style={styles.loadingContainer}>
            <Text style={{ fontSize: 16, color: '#b91c1c', marginBottom: 8 }}>Error in step {step}</Text>
            <Text selectable style={{ color: '#111' }}>{String(this.state.error)}</Text>
            {this.state.info?.componentStack ? (
              <Text selectable style={{ color: '#6b7280', marginTop: 8 }}>{this.state.info.componentStack}</Text>
            ) : null}
            <TouchableOpacity
              onPress={() => this.setState({ hasError: false, error: null, info: null })}
              style={{ padding: 10, backgroundColor: '#e5e7eb', borderRadius: 8, marginTop: 16 }}
            >
              <Text>Reset Error</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return this.props.children;
    }
  }

  const TestView = ({ label = 'Bare View' }) => (
    <View style={styles.loadingContainer}>
      <Text style={{ fontSize: 18, color: colors.textPrimary }}>{label}</Text>
      <Text style={{ marginTop: 8, color: '#666' }}>Step {step}</Text>
      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => setStep(Math.max(0, step - 1))}
          style={{ padding: 10, backgroundColor: '#e5e7eb', borderRadius: 8, marginRight: 8 }}
        >
          <Text>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setStep(Math.min(6, step + 1))}
          style={{ padding: 10, backgroundColor: colors.brand, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>Next</Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: 16 }}>
        <Text style={{ color: '#444' }}>Stages:</Text>
        <Text style={{ color: '#666' }}>0 Bare</Text>
        <Text style={{ color: '#666' }}>1 AuthProvider</Text>
        <Text style={{ color: '#666' }}>2 SupabaseProvider + Auth</Text>
        <Text style={{ color: '#666' }}>3 DrawerProvider + Supabase + Auth</Text>
        <Text style={{ color: '#666' }}>4 NavigationContainer (empty)</Text>
        <Text style={{ color: '#666' }}>5 Navigation with one screen</Text>
        <Text style={{ color: '#666' }}>6 Full AppContent</Text>
      </View>
    </View>
  );

  // Minimal single screen for stages 5+
  const MinimalScreen = () => (
    <View style={styles.loadingContainer}>
      <Text style={{ fontSize: 18 }}>Minimal Screen OK</Text>
    </View>
  );

  const renderStage = () => {
    if (step === 0) return <TestView label="Bare View" />;
    if (step === 1) return (
      <AuthProvider>
        <TestView label="AuthProvider only" />
      </AuthProvider>
    );
    if (step === 2) return (
      <SupabaseProvider>
        <AuthProvider>
          <TestView label="Supabase + Auth" />
        </AuthProvider>
      </SupabaseProvider>
    );
    if (step === 3) return (
      <SupabaseProvider>
        <AuthProvider>
          <DrawerProvider>
            <TestView label="Drawer + Supabase + Auth" />
          </DrawerProvider>
        </AuthProvider>
      </SupabaseProvider>
    );
    if (step === 4) return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Test" component={MinimalScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    );
    if (step === 5) return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SupabaseProvider>
          <AuthProvider>
            <DrawerProvider>
              <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Minimal" component={MinimalScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </DrawerProvider>
          </AuthProvider>
        </SupabaseProvider>
      </GestureHandlerRootView>
    );
    // step >= 6 => full app content
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SupabaseProvider>
          <AuthProvider>
            <DrawerProvider>
              <AppContent />
            </DrawerProvider>
          </AuthProvider>
        </SupabaseProvider>
      </GestureHandlerRootView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ErrorBoundary>
        {renderStage()}
      </ErrorBoundary>
      {/* Test controls should not block tab navigation when running full app (step 6) */}
      {step < 6 && (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
          pointerEvents="box-none"
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: 8,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <TouchableOpacity
              onPress={() => setStep(Math.max(0, step - 1))}
              style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#e5e7eb', borderRadius: 8, marginRight: 8 }}
            >
              <Text>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStep(Math.min(6, step + 1))}
              style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.brand, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff' }}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Passenger Tab Navigator
function PassengerTabNavigator({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Routes') {
            iconName = 'bus-outline';
          } else if (route.name === 'Map') {
            iconName = 'map-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }

          return (
            <View
              style={{
                paddingHorizontal: focused ? 12 : 0,
                paddingVertical: focused ? 6 : 0,
                borderRadius: radius.pill,
                backgroundColor: focused ? '#F5F5F5' : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Routes" 
        component={BusListScreen}
        options={{
          tabBarLabel: 'Routes',
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Driver Tab Navigator
function DriverTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'DriverHome') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'DriverMap') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'DriverProfile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="DriverHome" 
        component={DriverHomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="DriverMap" 
        component={DriverMapScreen}
        options={{
          tabBarLabel: 'Map',
        }}
      />
      <Tab.Screen 
        name="Schedule" 
        component={DriverScheduleScreen}
        options={{
          tabBarLabel: 'Schedule',
        }}
      />
      <Tab.Screen 
        name="DriverProfile" 
        component={DriverProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Driver Authentication Wrapper
function DriverAuthWrapper({ navigation }) {
  const [isDriverAuthenticated, setIsDriverAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDriverAuthentication();
  }, []);

  const checkDriverAuthentication = async () => {
    try {
      const driverSession = await AsyncStorage.getItem('driverSession');
      if (driverSession) {
        const session = JSON.parse(driverSession);
        if (session.driver_id) {
          setIsDriverAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error checking driver authentication:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsDriverAuthenticated(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.success} />
      </View>
    );
  }

  if (!isDriverAuthenticated) {
    return <DriverLoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <DriverTabNavigator />;
}

// Main App Component with Authentication
function AppContent() {
  const { user, loading, showResetPassword, setShowResetPassword } = useAuth();
  const [currentRole, setCurrentRole] = useState('passenger');
  const [driverAuthenticated, setDriverAuthenticated] = useState(false);
  const navigationRef = React.useRef(null);

  const handleRoleChange = (newRole) => {
    setCurrentRole(newRole);
    if (newRole === 'driver') {
      // Reset driver authentication when switching to driver mode
      setDriverAuthenticated(false);
    } else if (newRole === 'passenger') {
      // Reset driver authentication when switching to passenger mode
      setDriverAuthenticated(false);
    }
  };

  const handleDriverLogin = () => {
    setDriverAuthenticated(true);
  };

  const handleBackToPassenger = () => {
    setCurrentRole('passenger');
    setDriverAuthenticated(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Handle password reset screen - show it if user clicked reset link
  // This happens when user clicks reset link in email, then opens the app
  if (showResetPassword && currentRole === 'passenger') {
    return (
      <NavigationContainer ref={navigationRef}>
        <ResetPasswordScreen 
          navigation={{
            navigate: (screen) => {
              if (screen === 'Login') {
                setShowResetPassword(false);
              }
            },
            goBack: () => {
              setShowResetPassword(false);
            }
          }}
        />
      </NavigationContainer>
    );
  }

  // When no passenger user is logged in and we're in passenger mode,
  // show the passenger login screen with an option to switch to driver login.
  if (!user && currentRole === 'passenger') {
    return (
      <LoginScreen
        onSwitchToDriver={() => {
          setCurrentRole('driver');
          setDriverAuthenticated(false);
        }}
      />
    );
  }

  // If switching to driver mode but not authenticated as driver, show driver login
  if (currentRole === 'driver' && !driverAuthenticated) {
    return (
      <SupabaseProvider>
        <DriverLoginScreen 
          onLoginSuccess={handleDriverLogin}
          onBackToPassenger={handleBackToPassenger}
        />
      </SupabaseProvider>
    );
  }

  return (
    <SupabaseProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={colors.brand} />
        <View style={styles.container}>
          {/* Main Navigation */}
          {currentRole === 'passenger' ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="PassengerTabs" component={PassengerTabNavigator} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Help" component={HelpScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            </Stack.Navigator>
          ) : (
            <DriverTabNavigator />
          )}
        </View>
      </NavigationContainer>
    </SupabaseProvider>
  );
}

export default function App() {
  // On cold start, attempt to restore any previously running driver background
  // tracking task (for example, after the OS killed the process or device reboot).
  useEffect(() => {
    restoreDriverBackgroundTrackingIfNeeded();
  }, []);

  if (TEST_MODE) {
    return <AppTestHarness />;
  }
  return (
    <SupabaseProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SupabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
