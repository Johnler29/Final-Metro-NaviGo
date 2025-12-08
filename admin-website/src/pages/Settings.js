import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Bell, Shield, Globe, Save, X, Check } from 'lucide-react';

const Settings = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [settings, setSettings] = useState({
    database: {
      host: 'localhost',
      port: '5432',
      name: 'metrobus_db',
      backupFrequency: 'daily',
      retentionDays: '30'
    },
    notifications: {
      emailEnabled: true,
      pushEnabled: true,
      emailAddress: 'admin@metronavigo.com',
      emergencyAlerts: true,
      maintenanceAlerts: true,
      systemAlerts: true
    },
    security: {
      sessionTimeout: '30',
      passwordPolicy: 'strong',
      twoFactorAuth: false,
      ipWhitelist: '',
      auditLogging: true
    },
    general: {
      systemName: 'Metro NaviGo',
      timezone: 'UTC',
      language: 'en',
      theme: 'light',
      autoRefresh: true,
      refreshInterval: '30'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async (section) => {
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would save to your backend here
      console.log(`Saving ${section} settings:`, settings[section]);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const renderDatabaseSettings = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Database Host</label>
          <input
            type="text"
            value={settings.database.host}
            onChange={(e) => handleInputChange('database', 'host', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
          <input
            type="text"
            value={settings.database.port}
            onChange={(e) => handleInputChange('database', 'port', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Database Name</label>
          <input
            type="text"
            value={settings.database.name}
            onChange={(e) => handleInputChange('database', 'name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
          <select
            value={settings.database.backupFrequency}
            onChange={(e) => handleInputChange('database', 'backupFrequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Retention Days</label>
          <input
            type="number"
            value={settings.database.retentionDays}
            onChange={(e) => handleInputChange('database', 'retentionDays', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
            <p className="text-sm text-gray-500">Enable email notifications for system alerts</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.emailEnabled}
              onChange={(e) => handleInputChange('notifications', 'emailEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
            <p className="text-sm text-gray-500">Enable push notifications for mobile devices</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.pushEnabled}
              onChange={(e) => handleInputChange('notifications', 'pushEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input
            type="email"
            value={settings.notifications.emailAddress}
            onChange={(e) => handleInputChange('notifications', 'emailAddress', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Alert Types</h4>
        <div className="space-y-2">
          {[
            { key: 'emergencyAlerts', label: 'Emergency Alerts', desc: 'Critical system failures and emergencies' },
            { key: 'maintenanceAlerts', label: 'Maintenance Alerts', desc: 'Scheduled maintenance and updates' },
            { key: 'systemAlerts', label: 'System Alerts', desc: 'General system notifications' }
          ].map((alert) => (
            <div key={alert.key} className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">{alert.label}</h5>
                <p className="text-xs text-gray-500">{alert.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications[alert.key]}
                  onChange={(e) => handleInputChange('notifications', alert.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => handleInputChange('security', 'sessionTimeout', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password Policy</label>
          <select
            value={settings.security.passwordPolicy}
            onChange={(e) => handleInputChange('security', 'passwordPolicy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="basic">Basic (8+ characters)</option>
            <option value="strong">Strong (12+ chars, mixed case, numbers, symbols)</option>
            <option value="enterprise">Enterprise (16+ chars, complex requirements)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
            <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.twoFactorAuth}
              onChange={(e) => handleInputChange('security', 'twoFactorAuth', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Audit Logging</h4>
            <p className="text-sm text-gray-500">Log all admin actions and system changes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.auditLogging}
              onChange={(e) => handleInputChange('security', 'auditLogging', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">IP Whitelist (comma-separated)</label>
        <textarea
          value={settings.security.ipWhitelist}
          onChange={(e) => handleInputChange('security', 'ipWhitelist', e.target.value)}
          placeholder="192.168.1.1, 10.0.0.0/8"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
        />
      </div>
    </div>
  );

  const renderGeneralSettings = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
          <input
            type="text"
            value={settings.general.systemName}
            onChange={(e) => handleInputChange('general', 'systemName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
            value={settings.general.timezone}
            onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={settings.general.language}
            onChange={(e) => handleInputChange('general', 'language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
          <select
            value={settings.general.theme}
            onChange={(e) => handleInputChange('general', 'theme', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Auto Refresh</h4>
            <p className="text-sm text-gray-500">Automatically refresh data in real-time</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.general.autoRefresh}
              onChange={(e) => handleInputChange('general', 'autoRefresh', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.general.autoRefresh && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval (seconds)</label>
            <input
              type="number"
              value={settings.general.refreshInterval}
              onChange={(e) => handleInputChange('general', 'refreshInterval', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'database':
        return renderDatabaseSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'general':
        return renderGeneralSettings();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">Settings</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Configure your MetroBus admin system settings</p>
      </div>

      {!activeSection ? (
        <>
          {/* Settings Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 ml-3">Database</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Configure database connections and backup settings
              </p>
              <button 
                onClick={() => setActiveSection('database')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Configure →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Bell className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 ml-3">Notifications</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Set up email and push notification preferences
              </p>
              <button 
                onClick={() => setActiveSection('notifications')}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Configure →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 ml-3">Security</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Manage user permissions and security settings
              </p>
              <button 
                onClick={() => setActiveSection('security')}
                className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
              >
                Configure →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 ml-3">General</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Basic system configuration and preferences
              </p>
              <button 
                onClick={() => setActiveSection('general')}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Configure →
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Database Connected</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">API Services Running</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Real-time Tracking Active</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveSection(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div className="flex items-center space-x-3">
                  {activeSection === 'database' && <Database className="w-6 h-6 text-blue-600" />}
                  {activeSection === 'notifications' && <Bell className="w-6 h-6 text-green-600" />}
                  {activeSection === 'security' && <Shield className="w-6 h-6 text-yellow-600" />}
                  {activeSection === 'general' && <Globe className="w-6 h-6 text-purple-600" />}
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {activeSection} Settings
                  </h2>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {saveStatus === 'success' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">Error saving</span>
                  </div>
                )}
                <button
                  onClick={() => handleSave(activeSection)}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {renderSettingsContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
