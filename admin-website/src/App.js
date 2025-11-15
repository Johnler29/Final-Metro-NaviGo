import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FleetManagement from './pages/FleetManagement';
import DriverManagement from './pages/DriverManagement';
import ScheduleManagement from './pages/ScheduleManagement';
import UserManagement from './pages/UserManagement';
import PingNotifications from './pages/PingNotifications';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ConfigurationSetup from './components/ConfigurationSetup';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  // Check if Supabase is properly configured
  const isSupabaseConfigured = () => {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    return url && 
           key && 
           url !== 'https://your-project-id.supabase.co' && 
           key !== 'your_anon_key_here' &&
           url.startsWith('https://') &&
           key.length > 20;
  };

  // Show configuration setup if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <ConfigurationSetup />;
  }

  return (
    <SupabaseProvider>
      <Router>
        <AuthProvider>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="fleet" element={<FleetManagement />} />
                <Route path="drivers" element={<DriverManagement />} />
                <Route path="schedules" element={<ScheduleManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="pings" element={<PingNotifications />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </div>
        </AuthProvider>
      </Router>
    </SupabaseProvider>
  );
}

export default App;
