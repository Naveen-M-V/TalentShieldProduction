import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@mui/material';
import {
  HomeIcon,
  UserCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CalendarDaysIcon,
  FolderIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const UserNavigation = ({ activeTab, setActiveTab, notifications, onLogout, user, isEmployeeUser }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navigationItems = [
    { id: 'overview', name: 'Overview', icon: HomeIcon, showForProfile: false },
    { id: 'profile', name: 'My Profile', icon: UserCircleIcon, showForProfile: false },
    { id: 'clock-ins', name: 'Clock-ins', icon: ClockIcon, showForProfile: false },
    { id: 'shifts', name: 'My Shifts', icon: CalendarDaysIcon, showForProfile: false },
    { id: 'documents', name: 'Documents', icon: FolderIcon, showForProfile: false },
    { id: 'performance', name: 'Performance', icon: DocumentTextIcon, showForProfile: false },
    { id: 'calendar', name: 'Calendar', icon: CalendarIcon, showForProfile: false, tooltip: 'Calendar & Leave' },
    { id: 'expenses', name: 'Expenses', icon: CurrencyDollarIcon, showForProfile: false },
    { id: 'notifications', name: 'Notifications', icon: BellIcon, badge: notifications?.length || 0, showForProfile: true },
  ].filter(item => isEmployeeUser || item.showForProfile);

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <img
                src="/TSL.png"
                alt="TalentShield"
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="ml-3 hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">TalentShield</h1>
                <p className="text-xs text-gray-500">Employee Portal</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    // Do not navigate away for user dashboard tabs (expenses should open as a tab)
                    if (item.path && item.id !== 'expenses') navigate(item.path);
                  }}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {item.badge > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* User Profile & Logout */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* User Info */}
            <Tooltip title={`${user?.firstName} ${user?.lastName}`} placement="bottom" arrow>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500">Employee</div>
                </div>
              </div>
            </Tooltip>

            {/* Logout Button */}
            <Tooltip title="Logout" placement="bottom" arrow>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Tooltip title={item.name} placement="right" arrow>
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.path && item.id !== 'expenses') navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Mobile User Info & Logout */}
          <div className="border-t border-gray-200 px-4 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default UserNavigation;
