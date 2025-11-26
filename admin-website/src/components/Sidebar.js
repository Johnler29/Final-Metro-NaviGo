import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  Users, 
  Navigation,
  Calendar, 
  UserCheck, 
  Settings,
  Bell,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Bus Management', href: '/fleet', icon: Bus },
    { name: 'Driver Management', href: '/drivers', icon: Users },
    { name: 'Route Management', href: '/routes', icon: Navigation },
    { name: 'Schedule Management', href: '/schedules', icon: Calendar },
    { name: 'User Management', href: '/users', icon: UserCheck },
    { name: 'Ping Notifications', href: '/pings', icon: Bell },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden 
                   transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 glass border-r border-white/20
        transform transition-transform duration-500 ease-smooth lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-elevation-4
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/20 
                      bg-white/30 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-primary-500 rounded-2xl flex items-center 
                          justify-center shadow-glow group-hover:shadow-glow-lg 
                          transition-all duration-300 hover:scale-105">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Metro NaviGo</h1>
              <p className="text-xs text-gray-500 font-semibold">Admin Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-700 
                     hover:bg-white/50 transition-all duration-300 hover:scale-110 
                     active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-1.5">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`
                    group flex items-center px-4 py-3.5 text-sm font-semibold rounded-xl
                    transition-all duration-300 relative overflow-hidden
                    animate-slide-in
                    ${isActive 
                      ? 'bg-primary-500 text-white shadow-glow' 
                      : 'text-gray-700 hover:bg-white/40 hover:text-gray-900'
                    }
                  `}
                  onClick={onClose}
                >
                  {/* Hover effect */}
                  <div className={`
                    absolute inset-0 bg-primary-500/10
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    ${isActive ? 'hidden' : ''}
                  `}></div>
                  
                  <item.icon 
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300
                      ${isActive 
                        ? 'text-white scale-110' 
                        : 'text-gray-400 group-hover:text-primary-600 group-hover:scale-110'
                      }
                    `} 
                  />
                  <span className="relative z-10">{item.name}</span>
                  
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white shadow-lg 
                                  animate-pulse-subtle"></div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t border-white/20 
                      bg-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse-subtle 
                              shadow-lg shadow-green-500/50"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full 
                              animate-ping opacity-75"></div>
              </div>
              <span className="text-xs font-semibold text-gray-700">System Online</span>
            </div>
            <span className="text-xs text-gray-500 font-semibold bg-white/40 px-2 py-1 
                           rounded-lg">v1.0</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
