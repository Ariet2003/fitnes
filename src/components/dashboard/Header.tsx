'use client';

import { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Search, 
  User,
  ChevronDown,
  LogOut,
  Dumbbell
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-800 shadow-sm border-b border-gray-700 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 z-60">
      {/* Левая часть */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Логотип */}
        <div className="flex items-center space-x-2 lg:space-x-3">
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
            <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
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

        {/* Поиск */}
        <div className="relative hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск клиентов, абонементов..."
            className="w-48 sm:w-64 lg:w-80 pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Правая часть */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Уведомления */}
        <button className="relative p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></span>
          </span>
        </button>

        {/* Профиль пользователя */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg sm:rounded-xl transition-colors"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-white">Администратор</div>
              <div className="text-xs text-gray-400">admin@fitclub.com</div>
            </div>
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hidden sm:block" />
          </button>

          {/* Dropdown меню */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-gray-800 rounded-lg sm:rounded-xl shadow-lg border border-gray-700 py-2 z-50">
              <a
                href="/dashboard/profile"
                className="flex items-center px-3 sm:px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <User className="w-4 h-4 mr-2 sm:mr-3" />
                Профиль
              </a>
              <hr className="my-2 border-gray-700" />
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Ошибка при выходе:', error);
                  }
                }}
                className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-red-400 hover:bg-red-900 hover:text-red-300"
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
