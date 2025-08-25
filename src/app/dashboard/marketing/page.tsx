'use client';

import { useState, useEffect } from 'react';
import { 
  Send, 
  Edit3, 
  Trash2,
  Users,
  X,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  Target,
  TrendingUp,
  Zap,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import Image from 'next/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ToastContainer, useToast } from '@/components/ui/Toast';

interface News {
  id: number;
  title: string;
  content: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface SendResult {
  id: number;
  newsId: number;
  filterType: string;
  filterParams: any;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  status: string;
  sentAt: string;
  completedAt?: string;
}

interface FilterPreview {
  count: number;
  clients: Array<{
    id: number;
    fullName: string;
    phone: string;
    telegramId: string;
  }>;
}

interface Tariff {
  id: number;
  name: string;
  price: number;
  _count: {
    subscriptions: number;
  };
}

export default function MarketingPage() {
  // Messages state
  const [messages, setMessages] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<News | null>(null);
  const [messageFormData, setMessageFormData] = useState({
    title: '',
    content: '',
    photoUrl: ''
  });
  
  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState<News | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [filterParams, setFilterParams] = useState<any>({});
  const [filterPreview, setFilterPreview] = useState<FilterPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showClientsList, setShowClientsList] = useState(false);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [sendProgress, setSendProgress] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  });
  
  // Results modal state
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedMessageForResults, setSelectedMessageForResults] = useState<News | null>(null);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  
  // Common state
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
    // Toast notifications
  const { toasts, removeToast, success, error, warning, info } = useToast();

  // Block scroll when modals are open
  useEffect(() => {
    const hasOpenModal = showMessageModal || showSendModal || showProgressModal || showResultsModal || confirmDialog.isOpen;
    
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [showMessageModal, showSendModal, showProgressModal, showResultsModal, confirmDialog.isOpen]);
  
  useEffect(() => {
    loadMessages();
    loadTariffs();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMessages();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Load messages
  const loadMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        page: '1',
        limit: '20'
      });
      
      const response = await fetch(`/api/news?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке сообщений');
      }
      
      setMessages(data.news);
    } catch (err: any) {
      error('Ошибка загрузки', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load tariffs
  const loadTariffs = async () => {
    try {
      const response = await fetch('/api/tariffs');
      const data = await response.json();
      
      if (response.ok) {
        setTariffs(data || []);
      } else {
        throw new Error(data.error || 'Ошибка при загрузке тарифов');
      }
    } catch (err: any) {
      error('Ошибка загрузки', err.message);
    }
  };

  // Message CRUD operations
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingMessage ? `/api/news/${editingMessage.id}` : '/api/news';
      const method = editingMessage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при сохранении сообщения');
      }

      success(
        editingMessage ? 'Сообщение обновлено' : 'Сообщение создано',
        'Изменения успешно сохранены'
      );
      setShowMessageModal(false);
      setEditingMessage(null);
      setMessageFormData({ title: '', content: '', photoUrl: '' });
      loadMessages();
    } catch (err: any) {
      error('Ошибка сохранения', err.message);
    }
  };

  const handleDeleteMessage = (messageId: number) => {
    const messageToDelete = messages.find(m => m.id === messageId);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Удалить сообщение',
      message: 'Вы уверены, что хотите удалить это сообщение? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        try {
          // Сначала удаляем изображение, если оно есть
          if (messageToDelete?.photoUrl) {
            await handleDeleteImage(messageToDelete.photoUrl);
          }

          const response = await fetch(`/api/news/${messageId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Ошибка при удалении сообщения');
          }

          success('Сообщение удалено', 'Сообщение успешно удалено из системы');
          loadMessages();
        } catch (err: any) {
          error('Ошибка удаления', err.message);
        }
      }
    });
  };

  // Delete image from S3
  const handleDeleteImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: imageUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при удалении изображения');
      }
    } catch (err: any) {
      error('Ошибка удаления', err.message);
    }
  };

  // Send operations
  const handleSendMessage = (message: News) => {
    setSendingMessage(message);
    setSelectedFilter('');
    setFilterParams({});
    setFilterPreview(null);
    setShowClientsList(false);
    setShowSendModal(true);
  };

  const loadFilterPreview = async () => {
    if (!selectedFilter) return;

    try {
      setPreviewLoading(true);
      const response = await fetch('/api/send-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterType: selectedFilter,
          filterParams: filterParams
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке превью');
      }

      setFilterPreview(data);
    } catch (err: any) {
      error('Ошибка загрузки', err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFilter) {
      loadFilterPreview();
    }
  }, [selectedFilter, filterParams]);

  const handleSendSubmit = async () => {
    if (!sendingMessage || !selectedFilter) {
      error('Ошибка отправки', 'Выберите фильтр для отправки');
      return;
    }

    if (!filterPreview || filterPreview.count === 0) {
      error('Нет получателей', 'Для выбранного фильтра не найдено получателей');
      return;
    }

    // Закрываем модальное окно отправки и открываем прогресс
    setShowSendModal(false);
    setSendProgress({
      total: filterPreview.count,
      sent: 0,
      failed: 0,
      pending: filterPreview.count
    });
    setShowProgressModal(true);

    try {
      const response = await fetch(`/api/news/${sendingMessage.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterType: selectedFilter,
          filterParams: filterParams
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при отправке сообщения');
      }

      // Обновляем прогресс
      setSendProgress({
        total: data.sentTo.total,
        sent: data.sentTo.telegramResults.success || 0,
        failed: data.sentTo.telegramResults.failed || 0,
        pending: 0
      });

      success(
        'Рассылка завершена',
        `Сообщение "${sendingMessage.title}" отправлено ${data.sentTo.total} клиентам`
      );
    } catch (err: any) {
      error('Ошибка отправки', err.message);
      setSendProgress(prev => ({
        ...prev,
        failed: prev.total,
        pending: 0
      }));
    }
  };

  // Results operations
  const handleShowResults = async (message: News) => {
    setSelectedMessageForResults(message);
    setResultsLoading(true);
    setShowResultsModal(true);

    try {
      const response = await fetch(`/api/news/${message.id}/send-results`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке результатов');
      }

      setSendResults(data.sendResults);
    } catch (err: any) {
      error('Ошибка загрузки', err.message);
    } finally {
      setResultsLoading(false);
    }
  };

  // File upload
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке файла');
      }

      return data.url;
    } catch (err: any) {
      error('Ошибка загрузки', err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getFilterName = (filterType: string) => {
    const filters: { [key: string]: { name: string; icon: typeof Users } } = {
      'all': { name: 'Все клиенты', icon: Users },
      'expiring_soon': { name: 'Заканчивающиеся абонементы', icon: Calendar },
      'new_clients': { name: 'Новые клиенты', icon: TrendingUp },
      'by_tariff': { name: 'По тарифу', icon: Target }
    };
    return filters[filterType]?.name || filterType;
  };

  const getFilterIcon = (filterType: string) => {
    const filters: { [key: string]: typeof Users } = {
      'all': Users,
      'expiring_soon': Calendar,
      'new_clients': TrendingUp,
      'by_tariff': Target
    };
    return filters[filterType] || Users;
  };

  const getFilterDescription = (filterType: string, filterParams: any) => {
    switch (filterType) {
      case 'all':
        return 'Все клиенты с Telegram ID';
      case 'expiring_soon':
        const days = filterParams?.days || 7;
        return `Абонементы заканчиваются в течение ${days} дн.`;
      case 'new_clients':
        const regDays = filterParams?.days || 7;
        return `Зарегистрированы за последние ${regDays} дн.`;
      case 'by_tariff':
        const tariff = tariffs.find(t => t.id.toString() === filterParams?.tariffId);
        return tariff ? `Тариф: ${tariff.name} (${tariff.price}₽)` : 'Тариф не выбран';
      default:
        return filterType;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Рассылки</h1>
        <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Создание и отправка сообщений клиентам</p>
      </div>

      {/* Main Content */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Поиск сообщений..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setShowMessageModal(true);
              setEditingMessage(null);
              setMessageFormData({ title: '', content: '', photoUrl: '' });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Создать сообщение
          </button>
        </div>

        {/* Messages List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Сообщения не найдены
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {message.photoUrl && (
                          <div className="w-12 h-12 relative rounded-lg overflow-hidden">
                            <Image
                              src={message.photoUrl}
                              alt={message.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-medium">{message.title}</h3>
                          <p className="text-gray-400 text-sm">{formatDate(message.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-2">{message.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendMessage(message)}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Отправить"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleShowResults(message)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Результаты"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingMessage(message);
                          setMessageFormData({
                            title: message.title,
                            content: message.content,
                            photoUrl: message.photoUrl || ''
                          });
                          setShowMessageModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Message Create/Edit Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] min-h-screen">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-base font-semibold text-white">
                  {editingMessage ? 'Редактировать' : 'Создать'}
                </h2>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700/50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMessageSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Заголовок *
                  </label>
                  <input
                    type="text"
                    value={messageFormData.title}
                    onChange={(e) => setMessageFormData({ ...messageFormData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all text-sm"
                    placeholder="Введите заголовок"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Содержание *
                  </label>
                  <textarea
                    value={messageFormData.content}
                    onChange={(e) => setMessageFormData({ ...messageFormData, content: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all h-20 resize-none text-sm"
                    placeholder="Введите содержание сообщения"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Изображение
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Если есть старое изображение - удаляем его
                            if (messageFormData.photoUrl) {
                              await handleDeleteImage(messageFormData.photoUrl);
                            }
                            const url = await handleFileUpload(file);
                            if (url) {
                              setMessageFormData({ ...messageFormData, photoUrl: url });
                            }
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center px-3 py-4 border-2 border-dashed border-gray-600/50 rounded-lg hover:border-gray-500/50 transition-colors">
                        <div className="text-center">
                          {uploading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
                          ) : (
                            <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                          )}
                          <p className="text-xs text-gray-400">
                            {uploading ? 'Загрузка...' : 'Выбрать изображение'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {messageFormData.photoUrl && (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-600/50">
                        <Image
                          src={messageFormData.photoUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            await handleDeleteImage(messageFormData.photoUrl);
                            setMessageFormData({ ...messageFormData, photoUrl: '' });
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-md transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 p-4 border-t border-gray-700/50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 px-3 py-2 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {uploading ? 'Загрузка...' : editingMessage ? 'Обновить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && sendingMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[110] min-h-screen animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-700/30 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-500">
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-green-600/20 p-6 border-b border-gray-700/30">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-green-500/5 rounded-t-3xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl blur opacity-50 animate-pulse"></div>
                    <div className="relative p-3 bg-gray-800/90 rounded-xl border border-gray-600/50">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Отправить сообщение</h2>
                    <p className="text-gray-300 text-sm">Настройте параметры рассылки</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="text-gray-400 hover:text-white transition-all duration-200 p-2 hover:bg-gray-700/50 rounded-xl hover:scale-105"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Message Preview - Enhanced */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Превью сообщения</h3>
                        <p className="text-gray-400 text-sm">Так увидят ваши клиенты</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-700/30 rounded-xl border border-gray-600/20">
                      {sendingMessage.photoUrl && (
                        <div className="w-16 h-16 relative rounded-xl overflow-hidden border-2 border-gray-500/30 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <Image
                            src={sendingMessage.photoUrl}
                            alt={sendingMessage.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-lg mb-2 leading-tight">{sendingMessage.title}</h4>
                        <p className="text-gray-300 leading-relaxed">{sendingMessage.content}</p>
                        <div className="flex items-center gap-2 mt-3 text-gray-400 text-sm">
                          <Calendar className="w-4 h-4" />
                          {formatDate(sendingMessage.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Selection - Enhanced */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg">
                      <Target className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Выберите аудиторию</h3>
                      <p className="text-gray-400 text-sm">Настройте параметры получателей</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* All clients */}
                    <label className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${
                      selectedFilter === 'all' 
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20' 
                        : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600/30 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <input
                        type="radio"
                        name="filter"
                        value="all"
                        checked={selectedFilter === 'all'}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="absolute top-3 right-3 scale-90"
                      />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-xl">
                            <Users className="w-5 h-5 text-blue-300" />
                          </div>
                          <div className="text-white font-semibold">Все клиенты</div>
                        </div>
                        <div className="text-gray-300 text-sm">Отправить всем клиентам с Telegram ID</div>
                      </div>
                    </label>

                    {/* Expiring soon */}
                    <label className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${
                      selectedFilter === 'expiring_soon' 
                        ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 border-2 border-orange-500/50 shadow-lg shadow-orange-500/20' 
                        : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600/30 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <input
                        type="radio"
                        name="filter"
                        value="expiring_soon"
                        checked={selectedFilter === 'expiring_soon'}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="absolute top-3 right-3 scale-90"
                      />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gradient-to-r from-orange-500/30 to-yellow-500/30 rounded-xl">
                            <Calendar className="w-5 h-5 text-orange-300" />
                          </div>
                          <div className="text-white font-semibold">Заканчивающиеся</div>
                        </div>
                        <div className="text-gray-300 text-sm mb-3">Абонементы истекают в ближайшие дни</div>
                        {selectedFilter === 'expiring_soon' && (
                          <div className="flex items-center gap-2 animate-in slide-in-from-top duration-300">
                            <input
                              type="number"
                              placeholder="7"
                              value={filterParams.days || 7}
                              onChange={(e) => setFilterParams({ ...filterParams, days: parseInt(e.target.value) || 7 })}
                              className="w-16 px-2 py-1 bg-gray-700/50 border border-orange-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                              min="1"
                              max="30"
                            />
                            <span className="text-gray-300 text-sm">дней</span>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* New clients */}
                    <label className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${
                      selectedFilter === 'new_clients' 
                        ? 'bg-gradient-to-br from-green-500/20 to-green-600/30 border-2 border-green-500/50 shadow-lg shadow-green-500/20' 
                        : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600/30 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <input
                        type="radio"
                        name="filter"
                        value="new_clients"
                        checked={selectedFilter === 'new_clients'}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="absolute top-3 right-3 scale-90"
                      />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-green-300" />
                          </div>
                          <div className="text-white font-semibold">Новые клиенты</div>
                        </div>
                        <div className="text-gray-300 text-sm mb-3">Зарегистрированные недавно</div>
                        {selectedFilter === 'new_clients' && (
                          <div className="flex items-center gap-2 animate-in slide-in-from-top duration-300">
                            <input
                              type="number"
                              placeholder="7"
                              value={filterParams.days || 7}
                              onChange={(e) => setFilterParams({ ...filterParams, days: parseInt(e.target.value) || 7 })}
                              className="w-16 px-2 py-1 bg-gray-700/50 border border-green-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                              min="1"
                              max="30"
                            />
                            <span className="text-gray-300 text-sm">дней назад</span>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* By tariff */}
                    <label className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${
                      selectedFilter === 'by_tariff' 
                        ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/30 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20' 
                        : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600/30 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <input
                        type="radio"
                        name="filter"
                        value="by_tariff"
                        checked={selectedFilter === 'by_tariff'}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="absolute top-3 right-3 scale-90"
                      />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-xl">
                            <Target className="w-5 h-5 text-purple-300" />
                          </div>
                          <div className="text-white font-semibold">По тарифу</div>
                        </div>
                        <div className="text-gray-300 text-sm mb-3">Клиенты с определенным тарифом</div>
                        {selectedFilter === 'by_tariff' && (
                          <select
                            value={filterParams.tariffId || ''}
                            onChange={(e) => setFilterParams({ ...filterParams, tariffId: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 animate-in slide-in-from-top duration-300"
                          >
                            <option value="">Выберите тариф</option>
                            {tariffs.map((tariff) => (
                              <option key={tariff.id} value={tariff.id}>
                                {tariff.name} - {tariff.price}₽ ({tariff._count.subscriptions})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview - Enhanced */}
                {selectedFilter && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold">Получатели рассылки</h4>
                            <p className="text-gray-400 text-sm">Проверьте настройки перед отправкой</p>
                          </div>
                        </div>
                        {filterPreview && filterPreview.count > 0 && (
                          <button
                            onClick={() => setShowClientsList(!showClientsList)}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 text-sm font-medium px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200"
                          >
                            {showClientsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {showClientsList ? 'Скрыть' : 'Показать'} список
                          </button>
                        )}
                      </div>
                      
                      {previewLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
                          <p className="text-gray-400 text-sm">Загрузка получателей...</p>
                        </div>
                      ) : filterPreview ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-500/20">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                              <Users className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-white">{filterPreview.count}</div>
                              <div className="text-emerald-400 text-sm font-medium">получателей найдено</div>
                            </div>
                          </div>
                          
                          {showClientsList && filterPreview.clients.length > 0 && (
                            <div className="space-y-2 animate-in slide-in-from-top duration-300">
                              <h5 className="text-gray-300 font-medium text-sm">Список получателей:</h5>
                              <div className="space-y-1 max-h-48 overflow-y-auto bg-gray-700/50 rounded-xl p-3 border border-gray-600/30">
                                {filterPreview.clients.map((client, index) => (
                                  <div key={client.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-600/30 rounded-lg transition-colors">
                                    <span className="text-gray-300 font-medium">{index + 1}. {client.fullName}</span>
                                    <span className="text-gray-400">{client.phone}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                          </div>
                          <p className="text-red-400 font-medium">Не удалось загрузить превью</p>
                          <p className="text-gray-400 text-sm">Проверьте подключение и попробуйте снова</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions - Enhanced */}
            <div className="relative border-t border-gray-700/30 bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm">
              <div className="flex gap-4 p-6">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-600/50 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 border border-gray-500/30"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSendSubmit}
                  disabled={!selectedFilter || !filterPreview || filterPreview.count === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5" />
                  Отправить рассылку
                  {filterPreview && filterPreview.count > 0 && (
                    <span className="ml-1 px-2 py-1 bg-white/20 rounded-lg text-xs">
                      {filterPreview.count}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120] min-h-screen">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 w-full max-w-md shadow-2xl">
            <div className="p-6 text-center space-y-6">
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">Отправка сообщений</h2>
                <p className="text-gray-400 text-sm mt-2">Идет рассылка, пожалуйста подождите...</p>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50">
                  <div className="text-2xl font-bold text-white">{sendProgress.total}</div>
                  <div className="text-gray-400 text-xs">Всего</div>
                </div>
                <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
                  <div className="text-2xl font-bold text-green-400">{sendProgress.sent}</div>
                  <div className="text-gray-400 text-xs">Отправлено</div>
                </div>
                <div className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
                  <div className="text-2xl font-bold text-red-400">{sendProgress.failed}</div>
                  <div className="text-gray-400 text-xs">Ошибки</div>
                </div>
                <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
                  <div className="text-2xl font-bold text-blue-400">{sendProgress.pending}</div>
                  <div className="text-gray-400 text-xs">Ожидает</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ 
                      width: `${sendProgress.total > 0 ? ((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="text-sm text-gray-400">
                  {sendProgress.total > 0 ? Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100) : 0}% завершено
                </div>
              </div>

              <button
                onClick={() => setShowProgressModal(false)}
                className="w-full px-4 py-2.5 bg-gray-600/50 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedMessageForResults && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[130] min-h-screen">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">История рассылок</h2>
                  <p className="text-sm text-gray-400 truncate max-w-md">{selectedMessageForResults.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResultsModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {resultsLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-3"></div>
                  <p className="text-gray-400 text-sm">Загрузка результатов...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sendResults.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <BarChart3 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-400">Рассылки еще не было</p>
                      <p className="text-gray-500 text-sm mt-1">История появится после первой отправки</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sendResults.map((result) => {
                        const FilterIcon = getFilterIcon(result.filterType);
                        return (
                          <div key={result.id} className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-1.5 bg-gray-600/50 rounded-lg">
                                  <FilterIcon className="w-4 h-4 text-gray-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {getStatusIcon(result.status)}
                                    <span className="text-white font-medium text-sm">{getFilterName(result.filterType)}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span>{formatDate(result.sentAt)}</span>
                                    <span className="truncate">{getFilterDescription(result.filterType, result.filterParams)}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <div className="text-white font-bold">{result.totalRecipients}</div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="text-green-400 font-medium">{result.successCount}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                    <span className="text-red-400 font-medium">{result.failedCount}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                    <span className="text-blue-400 font-medium">{result.pendingCount}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}