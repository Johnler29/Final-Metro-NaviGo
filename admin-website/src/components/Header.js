import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Menu, Bell, Search, User, LogOut, Settings } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white sticky top-0 z-40 border-b border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 
                     hover:bg-gray-100 transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-64 lg:w-80 pl-10 pr-3 py-2.5 text-sm 
                         placeholder-gray-400 focus:outline-none focus:border-primary-500 
                         focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 
                         bg-white border border-gray-300 rounded-lg hover:border-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-700 
                           hover:bg-gray-100 rounded-lg transition-all duration-200 group">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full 
                           ring-2 ring-white"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 md:space-x-3 p-1 pr-2 md:pr-3 rounded-lg hover:bg-gray-100 
                       transition-all duration-200 group"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-500 rounded-lg flex items-center 
                             justify-center shadow-[0_2px_4px_rgba(245,158,11,0.2)] 
                             group-hover:shadow-[0_4px_8px_rgba(245,158,11,0.3)] 
                             transition-all duration-200">
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 font-medium">Administrator</p>
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl py-2 z-50 animate-scale-in 
                            shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]
                            border border-gray-200">
                <button className="flex items-center w-full px-4 py-2.5 text-sm font-semibold 
                                 text-gray-700 hover:bg-gray-50 transition-all duration-150 
                                 mx-1 rounded-lg group">
                  <Settings className="w-4 h-4 mr-3 text-gray-400 group-hover:text-primary-500 
                                    transition-colors" />
                  Settings
                </button>
                <div className="my-1 border-t border-gray-200"></div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2.5 text-sm font-semibold 
                           text-red-600 hover:bg-red-50 transition-all duration-150 
                           mx-1 rounded-lg group"
                >
                  <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
