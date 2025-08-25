'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ShoppingBag,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  X,
  Maximize
} from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UploadedFile {
  url: string;
  fileName: string;
  originalName: string;
  size: number;
  type: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
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
    price: ''
  });
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fullscreenData, setFullscreenData] = useState<{
    images: string[];
    currentIndex: number;
    productName: string;
  } | null>(null);
  const [imageCarousels, setImageCarousels] = useState<{[key: number]: number}>({});

  const itemsPerPage = 12;

  // Первоначальная загрузка
  useEffect(() => {
    loadProducts(true);
  }, []);

  // Фильтрация без полной перезагрузки
  useEffect(() => {
    if (!loading) { // Загружаем только если не идет первоначальная загрузка
      loadProducts(false);
    }
  }, [searchTerm, sortBy, sortOrder, currentPage]);

  const loadProducts = async (isInitialLoad = false) => {
    try {
      // Показываем полную загрузку только при первоначальной загрузке
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setFiltering(true);
      }

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
      setFiltering(false);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('📁 Выбраны файлы:', Array.from(files).map(f => f.name));
      setSelectedFiles(files);
      setError('');
      
      // Автоматически загружаем выбранные файлы
      await uploadFiles(files);
    } else {
      console.log('❌ Файлы не выбраны');
    }
  };

  const removeUploadedImage = async (index: number) => {
    const imageToRemove = uploadedImages[index];
    if (imageToRemove && imageToRemove.url) {
      // Удаляем файл из S3
      try {
        const response = await fetch('/api/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileUrl: imageToRemove.url }),
        });
        
        if (!response.ok) {
          console.error('Ошибка при удалении файла из S3');
        }
      } catch (error) {
        console.error('Ошибка при удалении файла:', error);
      }
    }
    
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: FileList) => {
    console.log(`📤 Начинаем автоматическую загрузку ${files.length} файлов`);
    setUploading(true);
    setError('');

    try {
      // Загружаем файлы по одному (как в AddClientModal)
      const uploadedFiles: UploadedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const formData = new FormData();
        formData.append('file', file); // Используем 'file', как в AddClientModal
        formData.append('folder', 'products');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Ошибка при загрузке файла ${file.name}`);
        }

        // Добавляем загруженный файл
        if (result.success && result.url) {
          const uploadedFile = {
            url: result.url,
            fileName: result.fileName || file.name,
            originalName: result.originalName || file.name,
            size: result.size || file.size,
            type: result.type || file.type
          };
          uploadedFiles.push(uploadedFile);
          console.log('✅ Файл успешно обработан:', uploadedFile);
        } else {
          console.error('❌ Неожиданный формат ответа:', result);
          throw new Error(`Неожиданный формат ответа для файла ${file.name}`);
        }
      }

      // Добавляем все загруженные изображения
      setUploadedImages(prev => {
        const newImages = [...prev, ...uploadedFiles];
        console.log('📸 Обновляем состояние изображений:', newImages);
        return newImages;
      });
      
      setSelectedFiles(null);
      
      // Очищаем input для возможности повторного выбора тех же файлов
      const fileInput = document.getElementById('product-images') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Ошибка при загрузке изображений:', error);
      setError(error instanceof Error ? error.message : 'Ошибка при загрузке изображений');
    } finally {
      setUploading(false);
    }
  };

  const uploadImages = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      console.log('❌ Нет выбранных файлов для загрузки');
      return;
    }

    await uploadFiles(selectedFiles);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: ''
    });
    setSelectedFiles(null);
    setUploadedImages([]);
    setError('');
    console.log('🆕 Открываем модальное окно создания продукта');
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString()
    });
    
    // Парсим существующие изображения из JSON
    let existingImages: UploadedFile[] = [];
    if (product.photoUrl) {
      try {
        const urls = JSON.parse(product.photoUrl);
        if (Array.isArray(urls)) {
          existingImages = urls.map((url, index) => ({
            url,
            fileName: `image-${index + 1}`,
            originalName: `Изображение ${index + 1}`,
            size: 0,
            type: 'image/jpeg'
          }));
        }
      } catch (e) {
        // Если это не JSON, значит старый формат с одним URL
        if (product.photoUrl.trim()) {
          existingImages = [{
            url: product.photoUrl,
            fileName: 'image-1',
            originalName: 'Изображение 1',
            size: 0,
            type: 'image/jpeg'
          }];
        }
      }
    }
    
    setUploadedImages(existingImages);
    setSelectedFiles(null);
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

    // Собираем URL всех загруженных изображений
    const photoUrls = uploadedImages.map(img => img.url);
    console.log('🖼️ Загруженные изображения:', uploadedImages);
    console.log('📋 URLs для отправки:', photoUrls);
    
    const data = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      photoUrls: photoUrls
    };

    console.log('📤 Отправляем данные на сервер:', data);

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
      
      // Перезагружаем список продуктов
      await loadProducts();
      
    } catch (error) {
      console.error('Ошибка при сохранении продукта:', error);
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

  const getProductImages = (product: Product): string[] => {
    if (!product.photoUrl) return [];
    
    try {
      const parsed = JSON.parse(product.photoUrl);
      return Array.isArray(parsed) ? parsed : [product.photoUrl];
    } catch (e) {
      return [product.photoUrl];
    }
  };

  const getCurrentImageIndex = (productId: number): number => {
    return imageCarousels[productId] || 0;
  };

  const nextImage = (productId: number, totalImages: number) => {
    setImageCarousels(prev => ({
      ...prev,
      [productId]: (getCurrentImageIndex(productId) + 1) % totalImages
    }));
  };

  const prevImage = (productId: number, totalImages: number) => {
    setImageCarousels(prev => ({
      ...prev,
      [productId]: (getCurrentImageIndex(productId) - 1 + totalImages) % totalImages
    }));
  };

  const openFullscreen = (product: Product, imageIndex: number) => {
    const images = getProductImages(product);
    if (images.length > 0) {
      setFullscreenData({
        images,
        currentIndex: imageIndex,
        productName: product.name
      });
    }
  };

  const closeFullscreen = () => {
    setFullscreenData(null);
  };

  const nextFullscreenImage = () => {
    if (!fullscreenData) return;
    setFullscreenData(prev => ({
      ...prev!,
      currentIndex: (prev!.currentIndex + 1) % prev!.images.length
    }));
  };

  const prevFullscreenImage = () => {
    if (!fullscreenData) return;
    setFullscreenData(prev => ({
      ...prev!,
      currentIndex: (prev!.currentIndex - 1 + prev!.images.length) % prev!.images.length
    }));
  };

  // Управление клавишами для полноэкранного просмотра
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenData) return;
      
      switch (e.key) {
        case 'Escape':
          closeFullscreen();
          break;
        case 'ArrowLeft':
          prevFullscreenImage();
          break;
        case 'ArrowRight':
          nextFullscreenImage();
          break;
      }
    };

    if (fullscreenData) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreenData]);

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
                  ? formatPrice(filteredProducts.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0) / filteredProducts.length)
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
      <div className="relative">
        {filtering && (
          <div className="absolute top-0 left-0 right-0 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 z-10">
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
              Обновление списка...
            </div>
          </div>
        )}
        
        <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${filtering ? 'opacity-70 pointer-events-none' : ''}`}>
        {filteredProducts.map(product => (
          <div key={product.id} className="group relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
            
            {/* Изображения с каруселью */}
            <div className="relative h-48 mb-4 bg-gray-700/30 rounded-t-3xl overflow-hidden group">
              {(() => {
                const images = getProductImages(product);
                const currentIndex = getCurrentImageIndex(product.id);

                if (images.length > 0) {
                  return (
                    <>
                      {/* Основное изображение */}
                      <div 
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => openFullscreen(product, currentIndex)}
                      >
                        <Image
                          src={images[currentIndex]}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.parentElement?.querySelector('.fallback') as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        
                        {/* Кнопка полноэкранного просмотра */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize className="w-3 h-3" />
                        </div>
                      </div>

                      {/* Навигация карусели */}
                      {images.length > 1 && (
                        <>
                          {/* Кнопка назад */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage(product.id, images.length);
                            }}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {/* Кнопка вперед */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage(product.id, images.length);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          {/* Индикаторы */}
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                            {images.map((_, index) => (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageCarousels(prev => ({
                                    ...prev,
                                    [product.id]: index
                                  }));
                                }}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  index === currentIndex 
                                    ? 'bg-white' 
                                    : 'bg-white/50 hover:bg-white/75'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Счетчик изображений */}
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg">
                            {currentIndex + 1}/{images.length}
                          </div>
                        </>
                      )}
                    </>
                  );
                }
                
                return null;
              })()}
              
              <div 
                className="fallback absolute inset-0 flex items-center justify-center bg-gray-700/50 backdrop-blur-sm" 
                style={{ display: product.photoUrl ? 'none' : 'flex' }}
              >
                <Package className="w-12 h-12 text-gray-400" />
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

              {/* Загрузка изображений */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Изображения продукта
                </label>
                
                {/* Загруженные изображения */}
                {uploadedImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">Загруженные изображения ({uploadedImages.length}):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <div className="relative w-full h-24 bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                            <Image
                              src={img.url}
                              alt={img.originalName}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {/* Наложение при наведении */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <span className="text-white text-xs text-center px-2">
                                {img.originalName}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Удалить изображение"
                          >
                            ×
                          </button>
                          {/* Номер изображения */}
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Первое изображение будет использоваться как основное
                    </p>
                  </div>
                )}

                {/* Выбор файлов */}
                <div className="space-y-3">
                  <input
                    type="file"
                    id="product-images"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  
                  <label
                    htmlFor="product-images"
                    className={`flex items-center justify-center gap-2 px-4 py-3 border border-gray-600 rounded-xl transition-colors cursor-pointer ${
                      uploading 
                        ? 'bg-gray-700/50 border-gray-600/50 cursor-not-allowed' 
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Загрузка изображений...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        {uploadedImages.length > 0 ? 'Добавить еще изображения' : 'Выбрать и загрузить изображения'}
                      </>
                    )}
                  </label>

                  <p className="text-xs text-gray-500">
                    Можно выбрать до 10 изображений. Поддерживаемые форматы: JPEG, PNG, WebP, GIF. Максимальный размер файла: 5MB.
                  </p>


                </div>
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

      {/* Полноэкранный просмотр изображения */}
      {fullscreenData && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* Кнопка назад (если больше одного изображения) */}
            {fullscreenData.images.length > 1 && (
              <button
                onClick={prevFullscreenImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all z-10 backdrop-blur-sm"
                title="Предыдущее изображение (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Кнопка вперед (если больше одного изображения) */}
            {fullscreenData.images.length > 1 && (
              <button
                onClick={nextFullscreenImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all z-10 backdrop-blur-sm"
                title="Следующее изображение (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Кнопка закрытия */}
            <button
              onClick={closeFullscreen}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
              title="Закрыть (Escape)"
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* Информация о товаре и счетчик */}
            <div className="absolute -top-12 left-0 text-white z-10">
              <h3 className="font-semibold text-lg mb-1">{fullscreenData.productName}</h3>
              {fullscreenData.images.length > 1 && (
                <div className="text-sm text-white/70">
                  {fullscreenData.currentIndex + 1} из {fullscreenData.images.length}
                </div>
              )}
            </div>
            
            {/* Изображение */}
            <div className="relative">
              <Image
                src={fullscreenData.images[fullscreenData.currentIndex]}
                alt={`${fullscreenData.productName} - изображение ${fullscreenData.currentIndex + 1}`}
                width={800}
                height={600}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onError={closeFullscreen}
              />
            </div>
            
            {/* Индикаторы (если больше одного изображения) */}
            {fullscreenData.images.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {fullscreenData.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setFullscreenData(prev => ({ ...prev!, currentIndex: index }))}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === fullscreenData.currentIndex 
                        ? 'bg-white' 
                        : 'bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Перейти к изображению ${index + 1}`}
                  />
                ))}
              </div>
            )}
            
            {/* Подсказки */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-white/70 text-sm text-center">
              {fullscreenData.images.length > 1 ? (
                <div>
                  <div>← → Навигация • Escape Закрыть • Клик по фону</div>
                </div>
              ) : (
                <div>Escape или клик по фону для закрытия</div>
              )}
            </div>
          </div>
          
          {/* Клик по фону для закрытия */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={closeFullscreen}
          />
        </div>
      )}
    </div>
  );
}
