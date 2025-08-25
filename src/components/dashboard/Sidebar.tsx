'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  CreditCard, 
  ShoppingBag, 
  Megaphone, 
  BarChart3,
  Settings,
  LogOut,
  Tag
} from 'lucide-react';

const menuItems = [
  {
    name: 'CRM',
    href: '/dashboard/clients',
    icon: Users,
    description: 'Управление клиентами'
  },
  {
    name: 'Тарифы',
    href: '/dashboard/tariffs',
    icon: Tag,
    description: 'Управление тарифами'
  },
  {
    name: 'Магазин',
    href: '/dashboard/products',
    icon: ShoppingBag,
    description: 'Товары и добавки'
  },
  {
    name: 'Рассылка',
    href: '/dashboard/marketing',
    icon: Megaphone,
    description: 'Новости и уведомления'
  },
  {
    name: 'Аналитика',
    href: '/dashboard/analytics',
    icon: BarChart3,
    description: 'Отчёты и статистика'
  },
  {
    name: 'Настройки',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Конфигурация системы'
  }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <>
      {/* Overlay для мобильных устройств */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-[4.5rem] sm:top-20 left-4 z-50 h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6rem)] w-64 sm:w-72 bg-gray-800 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        rounded-2xl shadow-2xl
      `}>
        <div className="flex flex-col h-full">
          {/* Навигационное меню */}
          <nav className="flex-1 px-2 lg:px-3 py-3 lg:py-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose} // Закрываем меню при клике на мобильных
                  className={`
                    flex items-center p-2.5 lg:p-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`
                    w-5 h-5 mr-3 transition-transform duration-200 flex-shrink-0
                    ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                  `} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    <div className={`
                      text-xs transition-colors duration-200 truncate hidden sm:block
                      ${isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-400'}
                    `}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Кнопка выхода */}
          <div className="p-2 lg:p-3 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full p-2.5 lg:p-3 text-gray-300 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 mr-3 group-hover:scale-105 transition-transform duration-200 flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm truncate">Выход</div>
                <div className="text-xs text-gray-500 group-hover:text-red-100 truncate hidden sm:block">
                  Завершить сессию
                </div>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
