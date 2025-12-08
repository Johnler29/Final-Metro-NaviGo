import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  Users, 
  Navigation,
  UserCheck, 
  Settings,
  Bell,
  X
} from 'lucide-react';
import NaviGoLogo from './Logo';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Bus Management', href: '/fleet', icon: Bus },
    { name: 'Bus Conductor Management', href: '/drivers', icon: Users },
    { name: 'Route Management', href: '/routes', icon: Navigation },
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
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1)]
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-20 px-4 md:px-6 border-b border-gray-200 
                      bg-white">
          <div className="flex items-center space-x-3">
            <NaviGoLogo variant="icon" className="w-10 h-10 md:w-11 md:h-11" />
            <div>
              <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight">Navi-GO</h1>
              <p className="text-xs text-gray-500 font-semibold">Admin Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-700 
                     hover:bg-gray-100 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 md:px-4 py-4 md:py-6 overflow-y-auto">
          <div className="space-y-1.5">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 md:px-4 py-3 text-sm font-semibold rounded-xl
                    transition-all duration-200 relative
                    ${isActive 
                      ? 'bg-primary-500 text-white shadow-[0_2px_4px_rgba(245,158,11,0.2)]' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={onClose}
                >
                  <item.icon 
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0 transition-all duration-200
                      ${isActive 
                        ? 'text-white' 
                        : 'text-gray-400 group-hover:text-primary-600'
                      }
                    `} 
                  />
                  <span className="relative z-10">{item.name}</span>
                  
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
        
        {/* Footer */}
        <div className="w-full p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-semibold text-gray-700">System Online</span>
            </div>
            <span className="text-xs text-gray-500 font-semibold bg-white px-2 py-1 
                           rounded-lg border border-gray-200">v1.0</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
