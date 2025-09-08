'use client';

import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, MessageSquare, UserCheck, ShoppingCart } from 'lucide-react';

interface OverviewData {
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
  totalTrainers?: number;
  activeTrainersThisPeriod?: number;
  totalSales?: number;
  salesThisPeriod?: number;
}

interface OverviewCardsProps {
  data: OverviewData;
  period: string;
}

export default function OverviewCards({ data, period }: OverviewCardsProps) {
  const periodText = {
    '7d': 'за 7 дней',
    '30d': 'за 30 дней',
    '3m': 'за 3 месяца',
    '6m': 'за 6 месяцев',
    '1y': 'за год',
    'custom': 'за период'
  }[period] || 'за период';

  const cards = [
    {
      title: 'Всего клиентов',
      value: data.totalClients,
      change: data.newClientsThisPeriod,
      changeText: `+${data.newClientsThisPeriod} ${periodText}`,
      icon: Users,
      color: 'blue',
      trend: data.newClientsThisPeriod > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Активные абонементы',
      value: data.activeSubscriptions,
      change: data.activeSubscriptions - data.expiredSubscriptions,
      changeText: `${data.expiredSubscriptions} истекших`,
      icon: Calendar,
      color: 'green',
      trend: data.activeSubscriptions > data.expiredSubscriptions ? 'up' : 'down'
    },
    {
      title: 'Тренеры',
      value: data.totalTrainers || 0,
      change: data.activeTrainersThisPeriod || 0,
      changeText: `${data.activeTrainersThisPeriod || 0} активных ${periodText}`,
      icon: UserCheck,
      color: 'cyan',
      trend: (data.activeTrainersThisPeriod || 0) > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Всего продаж',
      value: data.totalSales || 0,
      change: data.salesThisPeriod || 0,
      changeText: `+${data.salesThisPeriod || 0} ${periodText}`,
      icon: ShoppingCart,
      color: 'emerald',
      trend: (data.salesThisPeriod || 0) > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Общая выручка',
      value: `${data.totalRevenue.toLocaleString('ru-RU')} ₽`,
      change: data.revenueThisPeriod,
      changeText: `+${data.revenueThisPeriod.toLocaleString('ru-RU')} ₽ ${periodText}`,
      icon: DollarSign,
      color: 'purple',
      trend: data.revenueThisPeriod > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Всего посещений',
      value: data.totalVisits,
      change: data.visitsThisPeriod,
      changeText: `+${data.visitsThisPeriod} ${periodText}`,
      icon: TrendingUp,
      color: 'orange',
      trend: data.visitsThisPeriod > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Отзывы клиентов',
      value: data.feedbackCount,
      change: 0,
      changeText: 'Всего отзывов',
      icon: MessageSquare,
      color: 'pink',
      trend: 'neutral'
    },
    {
      title: 'Новости и рассылки',
      value: data.newsCount,
      change: 0,
      changeText: 'Всего сообщений',
      icon: MessageSquare,
      color: 'indigo',
      trend: 'neutral'
    }
  ];

  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
    indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30'
  };

  const iconColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    pink: 'text-pink-400',
    indigo: 'text-indigo-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400'
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trend === 'up' ? TrendingUp : card.trend === 'down' ? TrendingDown : null;
        
        return (
          <div
            key={index}
            className={`relative overflow-hidden bg-gradient-to-br ${colorClasses[card.color as keyof typeof colorClasses]} 
                       backdrop-blur-sm border rounded-xl sm:rounded-2xl p-4 sm:p-6`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-gray-300 text-xs sm:text-sm font-medium uppercase tracking-wide">
                  {card.title}
                </p>
                <p className="text-white text-xl sm:text-2xl lg:text-3xl font-bold mt-1 sm:mt-2">
                  {card.value}
                </p>
                <div className="flex items-center gap-1 mt-2 sm:mt-3">
                  {TrendIcon && (
                    <TrendIcon 
                      className={`w-3 h-3 sm:w-4 sm:h-4 ${
                        card.trend === 'up' ? 'text-green-400' : 'text-red-400'
                      }`} 
                    />
                  )}
                  <p className={`text-xs sm:text-sm ${
                    card.trend === 'up' ? 'text-green-400' : 
                    card.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {card.changeText}
                  </p>
                </div>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/10 ${iconColorClasses[card.color as keyof typeof iconColorClasses]}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
