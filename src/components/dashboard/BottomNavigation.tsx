'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  CreditCard, 
  ShoppingBag, 
  Megaphone, 
  BarChart3,
  Settings
} from 'lucide-react';

const menuItems = [
  {
    name: 'CRM',
    href: '/dashboard/clients',
    icon: Users
  },
  {
    name: 'Абонементы',
    href: '/dashboard/subscriptions',
    icon: CreditCard
  },
  {
    name: 'Магазин',
    href: '/dashboard/products',
    icon: ShoppingBag
  },
  {
    name: 'Рассылка',
    href: '/dashboard/marketing',
    icon: Megaphone
  },
  {
    name: 'Аналитика',
    href: '/dashboard/analytics',
    icon: BarChart3
  },
  {
    name: 'Настройки',
    href: '/dashboard/settings',
    icon: Settings
  }
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-50">
      <div className="flex items-center justify-around py-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              <item.icon className={`
                w-5 h-5 mb-1 transition-transform duration-200
                ${isActive ? 'scale-110' : 'hover:scale-105'}
              `} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}




