'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface Tariff {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  duration: number; // срок действия в месяцах
  freezeLimit: number;
  startTime: string;
  endTime: string;
  _count: {
    subscriptions: number;
  };
}

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [filteredTariffs, setFilteredTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    durationDays: '',
    freezeLimit: '',
    startTime: '',
    endTime: ''
  });
  const [error, setError] = useState('');

  const itemsPerPage = 12;

  useEffect(() => {
    loadTariffs();
  }, []);

  // Фильтрация и сортировка
  useEffect(() => {
    let filtered = [...tariffs];

    // Поиск
    if (searchTerm) {
      filtered = filtered.filter(tariff =>
        tariff.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = Number(a.price);
          bValue = Number(b.price);
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'subscriptions':
          aValue = a._count.subscriptions;
          bValue = b._count.subscriptions;
          break;
        default:
          return 0;
      }

      // Применяем порядок сортировки
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredTariffs(filtered);
    setCurrentPage(1);
  }, [tariffs, searchTerm, sortBy, sortOrder]);

  const loadTariffs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tariffs');
      if (response.ok) {
        const data = await response.json();
        setTariffs(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки тарифов:', error);
    } finally {
      setLoading(false);
    }
  };

  // Пагинация
  const totalPages = Math.ceil(filteredTariffs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTariffs = filteredTariffs.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const openCreateModal = () => {
    setEditingTariff(null);
    setFormData({
      name: '',
      price: '',
      duration: '',
      durationDays: '',
      freezeLimit: '',
      startTime: '08:00',
      endTime: '13:00'
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setFormData({
      name: tariff.name,
      price: tariff.price.toString(),
      duration: tariff.duration.toString(),
      durationDays: tariff.durationDays.toString(),
      freezeLimit: tariff.freezeLimit.toString(),
      startTime: tariff.startTime || '08:00',
      endTime: tariff.endTime || '13:00'
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.duration || !formData.durationDays || !formData.freezeLimit) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    const data = {
      name: formData.name,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      durationDays: parseInt(formData.durationDays),
      freezeLimit: parseInt(formData.freezeLimit),
      startTime: formData.startTime || '08:00',
      endTime: formData.endTime || '13:00'
    };

    try {
      const url = editingTariff ? `/api/tariffs/${editingTariff.id}` : '/api/tariffs';
      const method = editingTariff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении тарифа');
      }

      setShowModal(false);
      loadTariffs();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка при сохранении тарифа');
    }
  };

  const handleDelete = async (tariff: Tariff) => {
    if (tariff._count.subscriptions > 0) {
      alert('Нельзя удалить тариф, к которому привязаны подписки');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить тариф "${tariff.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tariffs/${tariff.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при удалении тарифа');
      }

      loadTariffs();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении тарифа');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Тарифы</h1>
          <p className="text-gray-400 mt-1">
            Найдено: {filteredTariffs.length} из {tariffs.length}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить тариф
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-800 transition-all"
            />
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-800 transition-all"
            >
              <option value="createdAt">По дате создания</option>
              <option value="name">По названию</option>
              <option value="price">По цене</option>
              <option value="duration">По длительности</option>
              <option value="subscriptions">По подпискам</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white hover:bg-gray-700/50 hover:border-blue-500/50 focus:outline-none focus:border-blue-500/50 transition-all flex items-center justify-center gap-2"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  По возрастанию
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  По убыванию
                </>
              )}
            </button>
          </div>

          <div className="text-sm text-gray-400 flex items-center">
            Страница {currentPage} из {totalPages}
          </div>
        </div>
      </div>

      {/* Tariffs Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {currentTariffs.map(tariff => (
          <div key={tariff.id} className="group relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
            
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {tariff.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    ₽{tariff.price}
                  </span>
                  <span className="text-gray-400 text-sm">/ {tariff.duration} мес.</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Срок действия</span>
                  <span className="text-white font-medium">{tariff.duration} месяц(ев)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Посещений</span>
                  <span className="text-white font-medium">{tariff.durationDays} дней</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Время работы</span>
                  <span className="text-white font-medium">{tariff.startTime} - {tariff.endTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Заморозки</span>
                  <span className="text-blue-400 font-medium">{tariff.freezeLimit} дней</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Активных подписок</span>
                  <span className="text-green-400 font-medium">{tariff._count.subscriptions}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(tariff)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 rounded-xl font-medium transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4" />
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(tariff)}
                  disabled={tariff._count.subscriptions > 0}
                  className="px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600/30 hover:border-red-500/30 rounded-xl transition-all duration-200"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {currentTariffs.length === 0 && (
          <div className="col-span-full text-center py-16 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {searchTerm ? 'Тарифы не найдены' : 'Нет тарифов'}
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm ? 'Попробуйте изменить условия поиска или создать новый тариф' : 'Создайте первый тариф для начала работы с клиентами'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Создать тариф
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-sm text-gray-400">
            Показано {startIndex + 1}-{Math.min(endIndex, filteredTariffs.length)} из {filteredTariffs.length}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-10 h-10 text-sm font-medium rounded-lg transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {editingTariff ? 'Редактировать тариф' : 'Новый тариф'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Название тарифа
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Стандарт"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Цена (₽)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="3000"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Срок (мес.)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="1"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Посещений
                  </label>
                  <input
                    type="number"
                    name="durationDays"
                    value={formData.durationDays}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="12"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Заморозки
                  </label>
                  <input
                    type="number"
                    name="freezeLimit"
                    value={formData.freezeLimit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="3"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Время начала
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Время окончания
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-2 border-t border-gray-700 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  {editingTariff ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
