'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ShoppingBag,
  Package,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  Upload
} from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    photoUrl: ''
  });
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const itemsPerPage = 12;

  useEffect(() => {
    loadProducts();
  }, [searchTerm, sortBy, sortOrder, currentPage]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке продуктов');
      }

      if (data.products) {
        setProducts(data.products);
        setFilteredProducts(data.products);
      } else {
        setProducts([]);
        setFilteredProducts([]);
      }

      if (data.pagination) {
        setTotalPages(data.pagination.pages);
      } else {
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Ошибка загрузки продуктов:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');

    // Обновляем превью изображения
    if (name === 'photoUrl') {
      setImagePreview(value || null);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      photoUrl: ''
    });
    setImagePreview(null);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      photoUrl: product.photoUrl || ''
    });
    setImagePreview(product.photoUrl || null);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.price) {
      setError('Название, описание и цена обязательны для заполнения');
      return;
    }

    if (parseFloat(formData.price) < 0) {
      setError('Цена не может быть отрицательной');
      return;
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      photoUrl: formData.photoUrl.trim() || null
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении продукта');
      }

      setShowModal(false);
      loadProducts();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка при сохранении продукта');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Вы уверены, что хотите удалить продукт "${product.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при удалении продукта');
      }

      loadProducts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении продукта');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Магазин товаров</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
            <span className="text-gray-400">
              Всего продуктов: <span className="text-white font-semibold">{filteredProducts.length}</span>
            </span>
            <span className="text-gray-400">
              Средняя цена: <span className="text-green-400 font-semibold">
                {filteredProducts.length > 0 
                  ? formatPrice(filteredProducts.reduce((sum, p) => sum + p.price, 0) / filteredProducts.length)
                  : '₽0'
                }
              </span>
            </span>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить продукт
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
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all"
            />
          </div>

          {/* Сортировка */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all min-w-[160px]"
              >
                <option value="createdAt">По дате создания</option>
                <option value="name">По названию</option>
                <option value="price">По цене</option>
                <option value="updatedAt">По обновлению</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white hover:bg-gray-600/50 focus:outline-none focus:border-blue-500 transition-all flex items-center justify-center gap-2 min-w-[120px]"
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
        </div>
      </div>
      
      {/* Сетка продуктов */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="group relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
            
            {/* Изображение */}
            <div className="relative h-48 mb-4 bg-gray-700/30 rounded-t-3xl overflow-hidden">
              {product.photoUrl ? (
                <Image
                  src={product.photoUrl}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="absolute inset-0 flex items-center justify-center bg-gray-700/50 backdrop-blur-sm" 
                style={{ display: product.photoUrl ? 'none' : 'flex' }}
              >
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              
              {/* Наложение с действиями */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <button
                  onClick={() => openEditModal(product)}
                  className="p-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  title="Редактировать"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 pt-0">
              {/* Заголовок и цена */}
              <div className="mb-3">
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>

              {/* Описание */}
              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                {product.description}
              </p>

              {/* Дата создания */}
              <div className="text-xs text-gray-500 mb-4">
                Создан: {formatDate(product.createdAt)}
              </div>

              {/* Действия */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(product)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 rounded-xl font-medium transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4" />
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 border border-gray-600/30 hover:border-red-500/30 rounded-xl transition-all duration-200"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Пустое состояние */}
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-16 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {searchTerm ? 'Продукты не найдены' : 'Нет продуктов'}
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm ? 'Попробуйте изменить условия поиска или создать новый продукт' : 'Создайте первый продукт для начала работы с магазином'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Создать продукт
            </button>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50">
          {/* Информация о странице */}
          <div className="text-sm text-gray-400">
            Страница <span className="text-white font-medium">{currentPage}</span> из{' '}
            <span className="text-white font-medium">{totalPages}</span>
          </div>

          {/* Навигация */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
              title="Первая страница"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-gray-300 bg-gray-700/50 hover:bg-gray-600 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500"
            >
              Назад
            </button>
            
            {/* Номера страниц */}
            <div className="flex space-x-1">
              {(() => {
                const pages = [];
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, currentPage + 2);
                
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`w-10 h-10 rounded-xl font-medium transition-all ${
                        currentPage === i
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                          : 'text-gray-300 bg-gray-700/50 hover:bg-gray-600 hover:text-white border border-gray-600/50 hover:border-gray-500'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                
                return pages;
              })()}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-gray-300 bg-gray-700/50 hover:bg-gray-600 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500"
            >
              Далее
            </button>

            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
              title="Последняя страница"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                {editingProduct ? 'Редактировать продукт' : 'Новый продукт'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-160px)]">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название продукта *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Протеин Whey"
                  required
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Описание *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="Описание продукта, его преимущества и характеристики..."
                  required
                />
              </div>

              {/* Цена */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Цена (₽) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="2990"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* URL изображения */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL изображения
                </label>
                <input
                  type="url"
                  name="photoUrl"
                  value={formData.photoUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="https://example.com/image.jpg"
                />
                
                {/* Превью изображения */}
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-400 mb-2">Превью:</p>
                    <div className="relative w-32 h-32 bg-gray-700 rounded-xl overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Превью"
                        fill
                        className="object-cover"
                        onError={() => setImagePreview(null)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Ошибка */}
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex space-x-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  {editingProduct ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
