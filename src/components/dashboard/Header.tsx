'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Menu, 
  Bell, 
  User,
  ChevronDown,
  LogOut,
  Dumbbell,
  Settings,
  Camera,
  CameraOff,
  UserCheck
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  isQRScannerEnabled: boolean;
  onToggleQRScanner: () => void;
}

export default function Header({ onToggleSidebar, isQRScannerEnabled, onToggleQRScanner }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Загружаем статистику уведомлений
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications/stats');
        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.total);
        }
      } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    // Тихая загрузка без индикаторов для автообновлений
    const silentFetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications/stats');
        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.total);
        }
      } catch (error) {
        // Игнорируем ошибки при автообновлении
      }
    };

    // Первая загрузка с индикатором
    fetchNotifications();
    
    // Автообновление каждые 5 секунд (синхронно со списком чатов)
    const interval = setInterval(silentFetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Закрытие меню при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-800 shadow-sm border-b border-gray-700 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 z-60">
      {/* Левая часть */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Логотип */}
        <div className="flex items-center space-x-2 lg:space-x-3">
          <img 
            src="/logo.svg" 
            alt="FitAdmin Logo" 
            className="w-8 h-8 sm:w-10 sm:h-10"
          />
          <div className="hidden sm:block">
            <h1 className="text-base lg:text-lg font-bold text-white">FitAdmin</h1>
            <p className="text-xs text-gray-400">Панель управления</p>
          </div>
        </div>

        {/* Кнопка меню для мобильных - теперь скрыта, так как будет нижняя навигация */}
        <button
          onClick={onToggleSidebar}
          className="hidden p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Правая часть */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* QR Scanner Toggle - скрыто на мобильных устройствах */}
        <button
          onClick={onToggleQRScanner}
          className={`hidden sm:flex relative p-1.5 sm:p-2 rounded-lg transition-all duration-200 group ${
            isQRScannerEnabled 
              ? 'text-green-400 bg-green-900/50 hover:bg-green-900/70' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          title={isQRScannerEnabled ? 'Выключить QR-сканер' : 'Включить QR-сканер'}
        >
          {isQRScannerEnabled ? (
            <Camera className="w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 group-hover:scale-110" />
          ) : (
            <CameraOff className="w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 group-hover:scale-110" />
          )}
          {isQRScannerEnabled && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </button>

        {/* Уведомления */}
        <Link href="/dashboard/notifications">
          <button className="relative p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200 group">
            <Bell className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 group-hover:scale-110 ${!isLoadingNotifications && notificationCount > 0 ? 'animate-pulse text-yellow-400' : ''}`} />
            {!isLoadingNotifications && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-800 animate-bounce">
                <span className="text-[10px] sm:text-xs font-bold text-white leading-none">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              </span>
            )}
            {isLoadingNotifications && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] bg-gray-500 rounded-full animate-pulse border-2 border-gray-800"></span>
            )}
          </button>
        </Link>

        {/* Профиль пользователя */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg sm:rounded-xl transition-colors"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-white">Администратор</div>
            </div>
            <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hidden sm:block transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown меню */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 sm:w-52 bg-gray-800 rounded-lg sm:rounded-xl shadow-lg border border-gray-700 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
              <Link
                href="/dashboard/trainers"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-3 sm:px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <UserCheck className="w-4 h-4 mr-2 sm:mr-3" />
                Тренеры
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-3 sm:px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4 mr-2 sm:mr-3" />
                Настройки
              </Link>
              <hr className="my-2 border-gray-700" />
              <button
                onClick={async () => {
                  setShowUserMenu(false);
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Ошибка при выходе:', error);
                  }
                }}
                className="flex items-center w-full px-3 sm:px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2 sm:mr-3" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
