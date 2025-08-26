'use client';

import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ChartData {
  clientsGrowth: Array<{ date: string; count: number; fullDate: string }>;
  visitsOverTime: Array<{ date: string; visits: number; fullDate: string }>;
  popularTariffs: Array<{ name: string; subscriptions: number; price: number }>;
  subscriptionStats: Array<{ status: string; count: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; fullDate: string }>;
  visitsByWeekday: Array<{ day: string; visits: number }>;
  topClients: Array<{ id: number; fullName: string; visits: number }>;
}

interface ChartsSectionProps {
  data: ChartData;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'];

const statusLabels = {
  active: 'Активные',
  frozen: 'Заморожены',
  completed: 'Завершены'
};

export default function ChartsSection({ data }: ChartsSectionProps) {
  // Кастомный Tooltip для графиков
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
      {/* График роста клиентской базы */}
      <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700" data-chart="clients-growth">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
          Динамика новых клиентов
        </h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.clientsGrowth}>
              <defs>
                <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#clientsGradient)" 
                name="Новые клиенты"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* График посещений */}
      <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700" data-chart="visits-overtime">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
          Динамика посещений
        </h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.visitsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="visits" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#ffffff' }}
                name="Посещения"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Популярные тарифы */}
      <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700" data-chart="popular-tariffs">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
          Популярные тарифы
        </h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.popularTariffs}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="subscriptions" 
                fill="#F59E0B"
                radius={[4, 4, 0, 0]}
                name="Подписки"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Статистика абонементов */}
      <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700" data-chart="subscription-stats">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
          Статистика абонементов
        </h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.subscriptionStats.map(stat => ({
                  name: statusLabels[stat.status as keyof typeof statusLabels] || stat.status,
                  value: stat.count
                }))}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.subscriptionStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Выручка по месяцам */}
      <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700" data-chart="revenue-by-month">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
          Выручка по месяцам
        </h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueByMonth}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value.toLocaleString('ru-RU')} ₽`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Выручка']}
                content={<CustomTooltip />}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#revenueGradient)" 
                name="Выручка"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Посещения по дням недели */}
      <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700" data-chart="visits-by-weekday">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
          Посещения по дням недели
        </h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.visitsByWeekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="visits" 
                fill="#06B6D4"
                radius={[4, 4, 0, 0]}
                name="Посещения"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Топ активных клиентов */}
      <div className="lg:col-span-2 bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
          Топ активных клиентов
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-300 font-medium p-2">Клиент</th>
                <th className="text-right text-gray-300 font-medium p-2">Посещений</th>
              </tr>
            </thead>
            <tbody>
              {data.topClients.map((client, index) => (
                <tr key={client.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${
                        COLORS[index % COLORS.length] === '#3B82F6' ? 'from-blue-500 to-blue-600' :
                        COLORS[index % COLORS.length] === '#10B981' ? 'from-green-500 to-green-600' :
                        COLORS[index % COLORS.length] === '#F59E0B' ? 'from-yellow-500 to-yellow-600' :
                        COLORS[index % COLORS.length] === '#EF4444' ? 'from-red-500 to-red-600' :
                        COLORS[index % COLORS.length] === '#8B5CF6' ? 'from-purple-500 to-purple-600' :
                        COLORS[index % COLORS.length] === '#F97316' ? 'from-orange-500 to-orange-600' :
                        'from-cyan-500 to-cyan-600'
                      } flex items-center justify-center text-white font-medium text-sm`}>
                        {index + 1}
                      </div>
                      <span className="text-white font-medium">{client.fullName}</span>
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-sm font-medium">
                      {client.visits}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
