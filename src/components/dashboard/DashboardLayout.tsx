'use client';

import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar - только для десктопа */}
      <div className="hidden lg:block">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      </div>

      {/* Header на всю ширину */}
      <Header onToggleSidebar={toggleSidebar} />

      {/* Bottom Navigation - только для мобильных */}
      <BottomNavigation />

      {/* Main content area */}
      <div className="lg:ml-[288px] xl:ml-[304px] pt-14 sm:pt-16 pb-16 lg:pb-0 min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-4rem)]">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
