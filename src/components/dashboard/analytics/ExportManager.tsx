'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AnalyticsData {
  overview: {
    totalClients: number;
    activeSubscriptions: number;
    totalVisits: number;
    totalRevenue: number;
    newClientsThisPeriod: number;
    visitsThisPeriod: number;
    revenueThisPeriod: number;
    expiredSubscriptions: number;
    feedbackCount: number;
    newsCount: number;
  };
  charts: {
    clientsGrowth: Array<{ date: string; count: number; fullDate: string }>;
    visitsOverTime: Array<{ date: string; visits: number; fullDate: string }>;
    popularTariffs: Array<{ name: string; subscriptions: number; price: number }>;
    subscriptionStats: Array<{ status: string; count: number }>;
    revenueByMonth: Array<{ month: string; revenue: number; fullDate: string }>;
    visitsByWeekday: Array<{ day: string; visits: number }>;
    topClients: Array<{ id: number; fullName: string; visits: number; tariff: string }>;
  };
  period: string;
}

interface ExportManagerProps {
  data: AnalyticsData;
  period: string;
}

export default function ExportManager({ data, period }: ExportManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const getPeriodLabel = () => {
    const labels: { [key: string]: string } = {
      '7d': '7 дней',
      '30d': '30 дней',
      '3m': '3 месяца',
      '6m': '6 месяцев',
      '1y': '1 год',
      'custom': 'Выбранный период'
    };
    return labels[period] || period;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Общая статистика
      const overviewData = [
        ['Метрика', 'Значение'],
        ['Общее количество клиентов', data.overview.totalClients],
        ['Активные абонементы', data.overview.activeSubscriptions],
        ['Общее количество посещений', data.overview.totalVisits],
        ['Общая выручка', `${data.overview.totalRevenue.toLocaleString('ru-RU')} ₽`],
        ['Новые клиенты за период', data.overview.newClientsThisPeriod],
        ['Посещения за период', data.overview.visitsThisPeriod],
        ['Выручка за период', `${data.overview.revenueThisPeriod.toLocaleString('ru-RU')} ₽`],
        ['Истекшие абонементы', data.overview.expiredSubscriptions],
        ['Количество отзывов', data.overview.feedbackCount],
        ['Количество новостей', data.overview.newsCount]
      ];
      
      const overviewWS = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWS, 'Общая статистика');

      // Динамика клиентов
      const clientsData = [
        ['Дата', 'Новые клиенты'],
        ...data.charts.clientsGrowth.map(item => [item.date, item.count])
      ];
      const clientsWS = XLSX.utils.aoa_to_sheet(clientsData);
      XLSX.utils.book_append_sheet(wb, clientsWS, 'Динамика клиентов');

      // Посещения
      const visitsData = [
        ['Дата', 'Посещения'],
        ...data.charts.visitsOverTime.map(item => [item.date, item.visits])
      ];
      const visitsWS = XLSX.utils.aoa_to_sheet(visitsData);
      XLSX.utils.book_append_sheet(wb, visitsWS, 'Посещения');

      // Популярные тарифы
      const tariffsData = [
        ['Тариф', 'Количество подписок', 'Цена'],
        ...data.charts.popularTariffs.map(item => [item.name, item.subscriptions, `${item.price} ₽`])
      ];
      const tariffsWS = XLSX.utils.aoa_to_sheet(tariffsData);
      XLSX.utils.book_append_sheet(wb, tariffsWS, 'Популярные тарифы');

      // Выручка по месяцам
      const revenueData = [
        ['Месяц', 'Выручка'],
        ...data.charts.revenueByMonth.map(item => [item.month, `${item.revenue.toLocaleString('ru-RU')} ₽`])
      ];
      const revenueWS = XLSX.utils.aoa_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, revenueWS, 'Выручка по месяцам');

      // Топ клиентов
      const topClientsData = [
        ['Клиент', 'Тариф', 'Количество посещений'],
        ...data.charts.topClients.map(item => [item.fullName, item.tariff, item.visits])
      ];
      const topClientsWS = XLSX.utils.aoa_to_sheet(topClientsData);
      XLSX.utils.book_append_sheet(wb, topClientsWS, 'Топ клиентов');

      // Сохранение файла
      const fileName = `Аналитика_${getPeriodLabel()}_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Ошибка экспорта в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  // PDF экспорт удален по запросу пользователя

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        title="Экспорт данных"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Экспорт</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px]">
          <div className="py-2">
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <span>Экспорт в Excel</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay для закрытия dropdown при клике вне */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
