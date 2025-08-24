'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MessageCircle, 
  CreditCard,
  MoreVertical,
  User,
  Eye
} from 'lucide-react';
import Image from 'next/image';
import AddClientModal from '@/components/dashboard/AddClientModal';
import ClientDetailsModal from '@/components/dashboard/ClientDetailsModal';

interface Client {
  id: number;
  fullName: string;
  phone: string;
  photoUrl?: string;
  telegramId?: string;
  status: boolean;
  createdAt: string;
  tariff?: {
    id: number;
    name: string;
    price: number;
  };
  subscriptions: Array<{
    id: number;
    status: string;
    endDate: string;
    remainingDays: number;
    tariff: {
      name: string;
    };
  }>;
  visits: Array<{
    visitDate: string;
  }>;
  _count: {
    visits: number;
    subscriptions: number;
  };
}

interface Tariff {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  freezeLimit: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tariffFilter, setTariffFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDetails, setShowClientDetails] = useState(false);

  // Загрузка данных
  useEffect(() => {
    loadClients();
    loadTariffs();
  }, [searchTerm, statusFilter, tariffFilter, sortBy, sortOrder, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClients = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        tariffId: tariffFilter === 'all' ? '' : tariffFilter,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '12'
      });

      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке клиентов');
      }

      if (data.clients) {
        setClients(data.clients);
      } else {
        setClients([]);
      }

      if (data.pagination && data.pagination.pages) {
        setTotalPages(data.pagination.pages);
      } else {
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Ошибка загрузки клиентов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTariffs = async () => {
    try {
      const response = await fetch('/api/tariffs');
      const data = await response.json();
      setTariffs(data);
    } catch (error) {
      console.error('Ошибка загрузки тарифов:', error);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleTelegram = (telegramId?: string) => {
    if (telegramId) {
      window.open(`https://t.me/${telegramId}`, '_blank');
    }
  };

  const getStatusBadge = (client: Client) => {
    const activeSubscription = client.subscriptions?.find(s => s.status === 'active');
    
    if (!activeSubscription) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-900 text-red-300">Без абонемента</span>;
    }
    
    const daysLeft = activeSubscription.remainingDays;
    if (daysLeft <= 0) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-700 text-red-300">Истек</span>;
    } else if (daysLeft <= 3) {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-900 text-orange-300">Истекает</span>;
    }
    
    return <span className="px-2 py-1 text-xs rounded-full bg-green-900 text-green-300">Активен</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getLastVisit = (visits: Array<{ visitDate: string }> | undefined) => {
    if (!visits || visits.length === 0) return 'Никогда';
    const lastVisit = new Date(visits[0].visitDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return formatDate(visits[0].visitDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">CRM - Управление клиентами</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
            <span className="text-gray-400">
              Всего: <span className="text-white font-semibold">{clients.length}</span>
            </span>
            <span className="text-gray-400">
              Активных: <span className="text-green-400 font-semibold">
                {clients.filter(c => c.subscriptions?.some(s => s.status === 'active')).length}
              </span>
            </span>
            <span className="text-gray-400">
              Без абонемента: <span className="text-orange-400 font-semibold">
                {clients.filter(c => (!c.subscriptions || c.subscriptions.length === 0)).length}
              </span>
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить клиента
        </button>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск по имени или телефону..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all"
            />
          </div>

          {/* Фильтры */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Фильтр по статусу */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all min-w-[140px]"
              >
                <option value="all">Все клиенты</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Фильтр по тарифу */}
            <div className="relative">
              <select
                value={tariffFilter}
                onChange={(e) => setTariffFilter(e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all min-w-[140px]"
              >
                <option value="all">Все тарифы</option>
                {tariffs.map(tariff => (
                  <option key={tariff.id} value={tariff.id.toString()}>
                    {tariff.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Сортировка */}
            <div className="relative">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="appearance-none px-4 py-3 pr-10 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all min-w-[160px]"
              >
                <option value="createdAt-desc">Новые первыми</option>
                <option value="createdAt-asc">Старые первыми</option>
                <option value="fullName-asc">По имени (А-Я)</option>
                <option value="fullName-desc">По имени (Я-А)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Список клиентов */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
        {/* Заголовки таблицы */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-700/50 border-b border-gray-600/50 text-sm font-medium text-gray-300">
          <div className="col-span-4">Клиент</div>
          <div className="col-span-2">Статус</div>
          <div className="col-span-2">Абонемент</div>
          <div className="col-span-2">Посещения</div>
          <div className="col-span-2">Действия</div>
        </div>

        {/* Строки клиентов */}
        <div className="divide-y divide-gray-700/50">
          {clients.map((client) => (
            <div key={client.id} className="p-4 hover:bg-gray-700/30 transition-all group">
              {/* Мобильная версия */}
              <div className="md:hidden space-y-3">
                {/* Основная информация */}
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    {client.photoUrl ? (
                      <Image
                        src={client.photoUrl}
                        alt={client.fullName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center" 
                      style={{ display: client.photoUrl ? 'none' : 'flex' }}
                    >
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
                      client.subscriptions?.some(s => s.status === 'active') ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-base">{client.fullName}</h3>
                    <p className="text-gray-400 text-sm">{client.phone}</p>
                    {client.telegramId && (
                      <p className="text-gray-500 text-xs">@{client.telegramId}</p>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(client)}
                  </div>
                </div>

                {/* Дополнительная информация */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Абонемент:</span>
                    {client.subscriptions && client.subscriptions.length > 0 ? (
                      <div className="mt-1">
                        <p className="text-white font-medium">{client.subscriptions[0].tariff.name}</p>
                        <p className="text-gray-400 text-xs">
                          До {formatDate(client.subscriptions[0].endDate)} ({client.subscriptions[0].remainingDays} дн.)
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 mt-1">Нет активного</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-400">Посещения:</span>
                    <div className="mt-1">
                      <p className="text-white font-medium">{client._count.visits} всего</p>
                      <p className="text-gray-400 text-xs">Последний: {getLastVisit(client.visits)}</p>
                    </div>
                  </div>
                </div>

                {/* Действия мобильная версия */}
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => handleWhatsApp(client.phone)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    WhatsApp
                  </button>
                  {client.telegramId && (
                    <button
                      onClick={() => handleTelegram(client.telegramId)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Telegram
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDetails(true);
                    }}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Десктопная версия */}
              <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                {/* Клиент */}
                <div className="col-span-4 flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    {client.photoUrl ? (
                      <Image
                        src={client.photoUrl}
                        alt={client.fullName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center" 
                      style={{ display: client.photoUrl ? 'none' : 'flex' }}
                    >
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${
                      client.subscriptions?.some(s => s.status === 'active') ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm">{client.fullName}</h3>
                    <p className="text-gray-400 text-xs">{client.phone}</p>
                    {client.telegramId && (
                      <p className="text-gray-500 text-xs">@{client.telegramId}</p>
                    )}
                  </div>
                </div>

                {/* Статус */}
                <div className="col-span-2">
                  {getStatusBadge(client)}
                </div>

                {/* Абонемент */}
                <div className="col-span-2">
                  {client.subscriptions && client.subscriptions.length > 0 ? (
                    <div>
                      <p className="text-white text-sm font-medium">{client.subscriptions[0].tariff.name}</p>
                      <p className="text-gray-400 text-xs">
                        {client.subscriptions[0].remainingDays} дн. осталось
                      </p>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Нет активного</span>
                  )}
                </div>

                {/* Посещения */}
                <div className="col-span-2">
                  <p className="text-white text-sm font-medium">{client._count.visits} всего</p>
                  <p className="text-gray-400 text-xs">{getLastVisit(client.visits)}</p>
                </div>

                {/* Действия */}
                <div className="col-span-2 flex space-x-2">
                  <button
                    onClick={() => handleWhatsApp(client.phone)}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title="WhatsApp"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  {client.telegramId && (
                    <button
                      onClick={() => handleTelegram(client.telegramId)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Telegram"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDetails(true);
                    }}
                    className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    title="Подробнее"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            Назад
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            Далее
          </button>
        </div>
      )}

      {/* Пустое состояние */}
      {clients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Клиенты не найдены</h3>
          <p className="text-gray-500 mb-6">Попробуйте изменить параметры поиска или добавьте нового клиента</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Добавить первого клиента
          </button>
        </div>
      )}

      {/* Модальные окна */}
      <AddClientModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        tariffs={tariffs}
        onClientAdded={loadClients}
      />
      
      <ClientDetailsModal
        isOpen={showClientDetails}
        onClose={() => setShowClientDetails(false)}
        clientId={selectedClient?.id || null}
        onClientUpdated={loadClients}
      />
    </div>
  );
}