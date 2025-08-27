'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import QRScanner from './QRScanner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [qrScannerEnabled, setQrScannerEnabled] = useState(false);
  const pathname = usePathname();
  const isNotificationsPage = pathname === '/dashboard/notifications';

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleQRScanner = () => {
    setQrScannerEnabled(!qrScannerEnabled);
  };

  if (isNotificationsPage) {
    return (
      <div className="h-screen bg-gray-900 overflow-hidden">
        {/* Sidebar - только для десктопа */}
        <div className="hidden lg:block">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        </div>

        {/* Header на всю ширину */}
        <Header 
          onToggleSidebar={toggleSidebar} 
          isQRScannerEnabled={qrScannerEnabled}
          onToggleQRScanner={toggleQRScanner}
        />

        {/* Bottom Navigation - только для мобильных */}
        <BottomNavigation />

        {/* Main content area для уведомлений - без отступов и прокрутки */}
        <div className="lg:ml-[288px] xl:ml-[304px] pt-14 sm:pt-16 pb-16 lg:pb-0 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] lg:h-[calc(100vh-0rem)]">
          {children}
        </div>

        {/* QR Scanner - работает на всех страницах */}
        <QRScanner isEnabled={qrScannerEnabled} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar - только для десктопа */}
      <div className="hidden lg:block">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      </div>

      {/* Header на всю ширину */}
      <Header 
        onToggleSidebar={toggleSidebar} 
        isQRScannerEnabled={qrScannerEnabled}
        onToggleQRScanner={toggleQRScanner}
      />

      {/* Bottom Navigation - только для мобильных */}
      <BottomNavigation />

      {/* Main content area */}
      <div className="lg:ml-[288px] xl:ml-[304px] pt-14 sm:pt-16 pb-16 lg:pb-0 min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-4rem)]">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* QR Scanner - работает на всех страницах */}
      <QRScanner isEnabled={qrScannerEnabled} />
    </div>
  );
}
