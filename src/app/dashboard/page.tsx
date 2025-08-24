import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity,
  Clock,
  DollarSign
} from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    {
      title: 'Активные клиенты',
      value: '248',
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Доход за месяц',
      value: '₽125,400',
      change: '+8%',
      trend: 'up',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Посещений сегодня',
      value: '67',
      change: '+15%',
      trend: 'up',
      icon: Activity,
      color: 'bg-purple-500'
    },
    {
      title: 'Истекающие абонементы',
      value: '23',
      change: '-5%',
      trend: 'down',
      icon: Clock,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Панель управления</h1>
        <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Добро пожаловать в систему управления фитнес-клубом</p>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700 hover:shadow-md hover:border-gray-600 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs sm:text-sm font-medium truncate">{stat.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stat.value}</p>
                <div className="flex items-center mt-1 sm:mt-2">
                  <span className={`text-xs sm:text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-gray-500 text-xs sm:text-sm ml-1 hidden sm:inline">от прошлого месяца</span>
                </div>
              </div>
              <div className={`${stat.color} p-3 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0`}>
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Последние действия */}
        <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Последние действия</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white truncate">Добавлен новый клиент</p>
                <p className="text-xs text-gray-400 truncate">Иван Петров - 2 минуты назад</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white truncate">Продлен абонемент</p>
                <p className="text-xs text-gray-400 truncate">Мария Сидорова - 15 минут назад</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white truncate">Зафиксировано посещение</p>
                <p className="text-xs text-gray-400 truncate">Алексей Иванов - 30 минут назад</p>
              </div>
            </div>
          </div>
        </div>

        {/* Быстрые действия */}
        <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button className="p-3 sm:p-4 bg-blue-900 hover:bg-blue-800 rounded-lg sm:rounded-xl border border-blue-700 transition-colors group">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs sm:text-sm font-medium text-blue-300">Добавить клиента</p>
            </button>
            <button className="p-3 sm:p-4 bg-green-900 hover:bg-green-800 rounded-lg sm:rounded-xl border border-green-700 transition-colors group">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs sm:text-sm font-medium text-green-300">Новый абонемент</p>
            </button>
            <button className="p-3 sm:p-4 bg-purple-900 hover:bg-purple-800 rounded-lg sm:rounded-xl border border-purple-700 transition-colors group">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs sm:text-sm font-medium text-purple-300">Отчет</p>
            </button>
            <button className="p-3 sm:p-4 bg-orange-900 hover:bg-orange-800 rounded-lg sm:rounded-xl border border-orange-700 transition-colors group">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs sm:text-sm font-medium text-orange-300">Рассылка</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}