'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  UserCheck,
  Users,
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

interface Trainer {
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

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [filteredTrainers, setFilteredTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
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
    trainerName: string;
  } | null>(null);
  const [imageCarousels, setImageCarousels] = useState<{[key: number]: number}>({});
  const [isMobile, setIsMobile] = useState(false);

  const itemsPerPage = 12;

  // Отслеживание размера экрана
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Первоначальная загрузка
  useEffect(() => {
    loadTrainers(true);
  }, []);

  // Фильтрация без полной перезагрузки
  useEffect(() => {
    if (!loading) { // Загружаем только если не идет первоначальная загрузка
      loadTrainers(false);
    }
  }, [searchTerm, sortBy, sortOrder, currentPage]);

  const loadTrainers = async (isInitialLoad = false) => {
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

      const response = await fetch(`/api/trainers?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке тренеров');
      }

      if (data.trainers) {
        setTrainers(data.trainers);
        setFilteredTrainers(data.trainers);
      } else {
        setTrainers([]);
        setFilteredTrainers([]);
      }

      if (data.pagination) {
        setTotalPages(data.pagination.pages);
      } else {
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Ошибка загрузки тренеров:', error);
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
      // Загружаем файлы по одному
      const uploadedFiles: UploadedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'trainers');

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
      const fileInput = document.getElementById('trainer-images') as HTMLInputElement;
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
    setEditingTrainer(null);
    setFormData({
      name: '',
      description: '',
      price: ''
    });
    setSelectedFiles(null);
    setUploadedImages([]);
    setError('');
    console.log('🆕 Открываем модальное окно создания тренера');
    setShowModal(true);
  };

  const openEditModal = (trainer: Trainer) => {
    setEditingTrainer(trainer);
    setFormData({
      name: trainer.name,
      description: trainer.description,
      price: trainer.price.toString()
    });
    
    // Парсим существующие изображения из JSON
    let existingImages: UploadedFile[] = [];
    if (trainer.photoUrl) {
      try {
        const urls = JSON.parse(trainer.photoUrl);
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
        if (trainer.photoUrl.trim()) {
          existingImages = [{
            url: trainer.photoUrl,
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
      setError('Имя, описание и цена обязательны для заполнения');
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
      const url = editingTrainer ? `/api/trainers/${editingTrainer.id}` : '/api/trainers';
      const method = editingTrainer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении тренера');
      }

      setShowModal(false);
      
      // Перезагружаем список тренеров
      await loadTrainers();
      
    } catch (error) {
      console.error('Ошибка при сохранении тренера:', error);
      setError(error instanceof Error ? error.message : 'Ошибка при сохранении тренера');
    }
  };

  const handleDelete = async (trainer: Trainer) => {
    if (!confirm(`Вы уверены, что хотите удалить тренера "${trainer.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/trainers/${trainer.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при удалении тренера');
      }

      loadTrainers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении тренера');
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

  const getTrainerImages = (trainer: Trainer): string[] => {
    if (!trainer.photoUrl) return [];
    
    try {
      const parsed = JSON.parse(trainer.photoUrl);
      return Array.isArray(parsed) ? parsed : [trainer.photoUrl];
    } catch (e) {
      return [trainer.photoUrl];
    }
  };

  const getCurrentImageIndex = (trainerId: number): number => {
    return imageCarousels[trainerId] || 0;
  };

  const nextImage = (trainerId: number, totalImages: number) => {
    setImageCarousels(prev => ({
      ...prev,
      [trainerId]: (getCurrentImageIndex(trainerId) + 1) % totalImages
    }));
  };

  const prevImage = (trainerId: number, totalImages: number) => {
    setImageCarousels(prev => ({
      ...prev,
      [trainerId]: (getCurrentImageIndex(trainerId) - 1 + totalImages) % totalImages
    }));
  };

  const openFullscreen = (trainer: Trainer, imageIndex: number) => {
    const images = getTrainerImages(trainer);
    if (images.length > 0) {
      setFullscreenData({
        images,
        currentIndex: imageIndex,
        trainerName: trainer.name
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Наши тренеры</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
            <span className="text-gray-400">
              Всего тренеров: <span className="text-white font-semibold">{filteredTrainers.length}</span>
            </span>
            <span className="text-gray-400">
              Средняя цена: <span className="text-green-400 font-semibold">
                {filteredTrainers.length > 0 
                  ? formatPrice(filteredTrainers.reduce((sum, t) => sum + parseFloat(t.price.toString()), 0) / filteredTrainers.length)
                  : '₽0'
                }
              </span>
            </span>
          </div>
        </div>
        {/* Desktop add button */}
        <button
          onClick={openCreateModal}
          className="hidden sm:flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить тренера
        </button>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
        {/* Mobile: Search and Add button on same row */}
        <div className="flex gap-3 mb-4 sm:hidden">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </button>
        </div>

        {/* Mobile: Filter and sort buttons parallel */}
        <div className="flex gap-3 sm:hidden">
          <div className="flex-1 relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none w-full px-4 py-3 pr-10 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all"
            >
              <option value="createdAt">По дате создания</option>
              <option value="name">По имени</option>
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
            className="px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white hover:bg-gray-600/50 focus:outline-none focus:border-blue-500 transition-all flex items-center justify-center"
          >
            {sortOrder === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Desktop layout (hidden on mobile) */}
        <div className="hidden sm:flex flex-col lg:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск по имени или описанию..."
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
                <option value="name">По имени</option>
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
      
      {/* Сетка тренеров */}
      <div className="relative">
        {filtering && (
          <div className="absolute top-0 left-0 right-0 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 z-10">
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
              Обновление списка...
            </div>
          </div>
        )}
        
        <div className={`grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${filtering ? 'opacity-70 pointer-events-none' : ''}`}>
        {filteredTrainers.map(trainer => (
          <div key={trainer.id} className="group relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
            
            {/* Изображения с каруселью */}
            <div className="relative h-40 sm:h-48 mb-3 sm:mb-4 bg-gray-700/30 rounded-t-3xl overflow-hidden group">
              {(() => {
                const images = getTrainerImages(trainer);
                const currentIndex = getCurrentImageIndex(trainer.id);

                if (images.length > 0) {
                  return (
                    <>
                      {/* Основное изображение */}
                      <div 
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => openFullscreen(trainer, currentIndex)}
                      >
                        <Image
                          src={images[currentIndex]}
                          alt={trainer.name}
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
                              prevImage(trainer.id, images.length);
                            }}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {/* Кнопка вперед */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage(trainer.id, images.length);
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
                                    [trainer.id]: index
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
                style={{ display: trainer.photoUrl ? 'none' : 'flex' }}
              >
                <UserCheck className="w-12 h-12 text-gray-400" />
              </div>
            </div>

            <div className="p-4 sm:p-6 pt-0">
              {/* Заголовок и цена */}
              <div className="mb-3">
                <h3 className="text-base sm:text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {trainer.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {formatPrice(trainer.price)}
                  </span>
                </div>
              </div>

              {/* Описание */}
              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                {trainer.description}
              </p>

              {/* Дата создания */}
              <div className="text-xs text-gray-500 mb-4">
                Добавлен: {formatDate(trainer.createdAt)}
              </div>

              {/* Действия */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(trainer)}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 rounded-xl font-medium transition-all duration-200 text-sm"
                >
                  <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Изменить</span>
                  <span className="sm:hidden">Изм.</span>
                </button>
                <button
                  onClick={() => handleDelete(trainer)}
                  className="px-2 sm:px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 border border-gray-600/30 hover:border-red-500/30 rounded-xl transition-all duration-200"
                  title="Удалить"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Пустое состояние */}
        {filteredTrainers.length === 0 && (
          <div className="col-span-full text-center py-16 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {searchTerm ? 'Тренеры не найдены' : 'Нет тренеров'}
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm ? 'Попробуйте изменить условия поиска или добавить нового тренера' : 'Добавьте первого тренера для начала работы'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Добавить тренера
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
              className="px-3 sm:px-4 py-2 text-gray-300 bg-gray-700/50 hover:bg-gray-600 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Назад</span>
              <span className="sm:hidden">←</span>
            </button>
            
            {/* Номера страниц */}
            <div className="flex space-x-1">
              {(() => {
                const pages = [];
                // На мобильных показываем меньше страниц
                const maxVisible = isMobile ? 3 : 5;
                const halfVisible = Math.floor(maxVisible / 2);
                const start = Math.max(1, currentPage - halfVisible);
                const end = Math.min(totalPages, start + maxVisible - 1);
                
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl font-medium transition-all text-sm sm:text-base ${
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
              className="px-3 sm:px-4 py-2 text-gray-300 bg-gray-700/50 hover:bg-gray-600 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Далее</span>
              <span className="sm:hidden">→</span>
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
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-800 rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                {editingTrainer ? 'Редактировать тренера' : 'Новый тренер'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-160px)]">
              {/* Имя */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Имя тренера *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Иван Иванов"
                  required
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Описание *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none sm:rows-4"
                  placeholder="Опыт работы, специализация..."
                  required
                />
              </div>

              {/* Цена */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Цена за тренировку (₽) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="2500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Загрузка изображений */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Фотографии тренера
                </label>
                
                {/* Загруженные изображения */}
                {uploadedImages.length > 0 && (
                  <div className="mb-3 sm:mb-4">
                    <p className="text-sm text-gray-400 mb-2">Загруженные изображения ({uploadedImages.length}):</p>
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <div className="relative w-full h-16 sm:h-24 bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                            <Image
                              src={img.url}
                              alt={img.originalName}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {/* Наложение при наведении */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <span className="text-white text-xs text-center px-1 sm:px-2">
                                {img.originalName}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(index)}
                            className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-5 sm:w-6 h-5 sm:h-6 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs sm:text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Удалить изображение"
                          >
                            ×
                          </button>
                          {/* Номер изображения */}
                          <div className="absolute top-0.5 sm:top-1 left-0.5 sm:left-1 bg-black/70 text-white text-xs px-1 sm:px-1.5 py-0.5 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 sm:mt-2">
                      Первое изображение будет использоваться как основное
                    </p>
                  </div>
                )}

                {/* Выбор файлов */}
                <div className="space-y-2 sm:space-y-3">
                  <input
                    type="file"
                    id="trainer-images"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  
                  <label
                    htmlFor="trainer-images"
                    className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-xl transition-colors cursor-pointer ${
                      uploading 
                        ? 'bg-gray-700/50 border-gray-600/50 cursor-not-allowed' 
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="text-sm sm:text-base">Загрузка...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-sm sm:text-base">
                          {uploadedImages.length > 0 ? 'Добавить еще' : 'Выбрать изображения'}
                        </span>
                      </>
                    )}
                  </label>

                  <p className="text-xs text-gray-500">
                    До 10 изображений. JPEG, PNG, WebP, GIF. Макс. 5MB.
                  </p>

                </div>
              </div>

              {/* Ошибка */}
              {error && (
                <div className="p-3 sm:p-4 bg-red-900/30 border border-red-700 rounded-xl">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex space-x-3 pt-3 sm:pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors text-sm sm:text-base"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm sm:text-base"
                >
                  {editingTrainer ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Полноэкранный просмотр изображения */}
      {fullscreenData && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative max-w-[95vw] sm:max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* Кнопка назад (если больше одного изображения) */}
            {fullscreenData.images.length > 1 && (
              <button
                onClick={prevFullscreenImage}
                className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-2 sm:p-3 rounded-full transition-all z-10 backdrop-blur-sm"
                title="Предыдущее изображение (←)"
              >
                <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Кнопка вперед (если больше одного изображения) */}
            {fullscreenData.images.length > 1 && (
              <button
                onClick={nextFullscreenImage}
                className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-2 sm:p-3 rounded-full transition-all z-10 backdrop-blur-sm"
                title="Следующее изображение (→)"
              >
                <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Кнопка закрытия */}
            <button
              onClick={closeFullscreen}
              className="absolute top-2 sm:-top-12 right-2 sm:right-0 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 sm:bg-transparent rounded-full p-1 sm:p-0"
              title="Закрыть (Escape)"
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            
            {/* Информация о тренере и счетчик */}
            <div className="absolute top-2 sm:-top-12 left-2 sm:left-0 text-white z-10 bg-black/50 sm:bg-transparent rounded-lg p-2 sm:p-0">
              <h3 className="font-semibold text-sm sm:text-lg mb-1">{fullscreenData.trainerName}</h3>
              {fullscreenData.images.length > 1 && (
                <div className="text-xs sm:text-sm text-white/70">
                  {fullscreenData.currentIndex + 1} из {fullscreenData.images.length}
                </div>
              )}
            </div>
            
            {/* Изображение */}
            <div className="relative">
              <Image
                src={fullscreenData.images[fullscreenData.currentIndex]}
                alt={`${fullscreenData.trainerName} - изображение ${fullscreenData.currentIndex + 1}`}
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
