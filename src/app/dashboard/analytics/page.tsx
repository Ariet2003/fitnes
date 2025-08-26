'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import OverviewCards from '@/components/dashboard/analytics/OverviewCards';
import ChartsSection from '@/components/dashboard/analytics/ChartsSection';
import PeriodSelector from '@/components/dashboard/analytics/PeriodSelector';
import ExportManager from '@/components/dashboard/analytics/ExportManager';

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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [customDates, setCustomDates] = useState<{ start?: Date; end?: Date }>({});
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (selectedPeriod: string, startDate?: Date, endDate?: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `/api/analytics?period=${selectedPeriod}`;
      if (selectedPeriod === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Не удалось загрузить аналитические данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period === 'custom' && customDates.start && customDates.end) {
      fetchAnalytics(period, customDates.start, customDates.end);
    } else if (period !== 'custom') {
      fetchAnalytics(period);
    }
  }, [period, customDates]);

  const handlePeriodChange = (newPeriod: string, startDate?: Date, endDate?: Date) => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom' && startDate && endDate) {
      setCustomDates({ start: startDate, end: endDate });
    } else {
      setCustomDates({});
    }
  };

  const handleRefresh = () => {
    if (period === 'custom' && customDates.start && customDates.end) {
      fetchAnalytics(period, customDates.start, customDates.end);
    } else {
      fetchAnalytics(period);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Аналитика и отчёты</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Статистика, отчёты и бизнес-аналитика
          </p>
        </div>
        
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Загрузка аналитических данных...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Аналитика и отчёты</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Статистика, отчёты и бизнес-аналитика
          </p>
        </div>
        
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg 
                     transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Аналитика и отчёты</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Статистика, отчёты и бизнес-аналитика
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />

          {/* Action Buttons */}
          <button
            onClick={handleRefresh}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
            title="Обновить данные"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {/* Export Manager */}
          {data && <ExportManager data={data} period={period} />}
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards data={data.overview} period={period} />

      {/* Charts Section */}
      <div data-export="charts">
        <ChartsSection data={data.charts} />
      </div>

      {/* Last Updated Info */}
      <div className="text-center text-gray-400 text-sm py-4">
        Последнее обновление: {new Date().toLocaleString('ru-RU')}
      </div>
    </div>
  );
}
