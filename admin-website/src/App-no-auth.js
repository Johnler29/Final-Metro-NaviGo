import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FleetManagement from './pages/FleetManagement';
import DriverManagement from './pages/DriverManagement';
import ScheduleManagement from './pages/ScheduleManagement';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <SupabaseProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="fleet" element={<FleetManagement />} />
              <Route path="drivers" element={<DriverManagement />} />
              <Route path="schedules" element={<ScheduleManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </SupabaseProvider>
  );
}

export default App;
