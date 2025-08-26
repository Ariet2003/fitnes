'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Clock, 
  User,
  MessageSquare,
  Phone,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import UserProfile from '@/components/ui/UserProfile';

interface Conversation {
  clientId: number;
  clientName: string;
  clientPhoto: string | null;
  clientPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  lastMessageFromUser: boolean;
}

interface ChatMessage {
  id: number;
  message: string;
  senderRole: 'user' | 'admin';
  createdAt: string;
  isReply: boolean;
  parentId?: number;
}

interface ChatData {
  client: {
    id: number;
    fullName: string;
    photoUrl: string | null;
    phone: string;
  };
  messages: ChatMessage[];
  total: number;
}

export default function NotificationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Функция для открытия профиля пользователя
  const openUserProfile = (userId: number) => {
    setSelectedUserId(userId);
    setShowUserProfile(true);
    
    // На мобильных закрываем чат
    if (isMobile) {
      setShowChatOnMobile(false);
      setSelectedChat(null);
    }
  };

  // Загрузка списка разговоров
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/notifications/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Ошибка загрузки разговоров:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка чата с конкретным пользователем
  const loadChat = async (clientId: number) => {
    setIsChatLoading(true);
    setShowChatOnMobile(true); // Показываем чат на мобильных
    try {
      const response = await fetch(`/api/notifications/chat/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedChat(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки чата:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Возврат к списку чатов (для мобильных)
  const backToChats = () => {
    setShowChatOnMobile(false);
    setSelectedChat(null);
  };

  // Отправка сообщения
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setIsSending(true);
    try {
      // Определяем parentId - каждое новое сообщение ссылается на предыдущее
      let parentId = null;
      
      if (selectedChat.messages.length > 0) {
        const lastMessage = selectedChat.messages[selectedChat.messages.length - 1];
        parentId = lastMessage.id;
      }

      const response = await fetch(`/api/notifications/chat/${selectedChat.client.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          parentId: parentId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessageData = data.message;
        
        // Добавляем сообщение в текущий чат незаметно
        setSelectedChat(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...prev.messages, {
              id: newMessageData.id,
              message: newMessageData.message,
              senderRole: newMessageData.senderRole,
              createdAt: newMessageData.createdAt,
              isReply: !!newMessageData.parentId
            }],
            total: prev.total + 1
          };
        });

        setNewMessage('');
        
        // Обновляем список разговоров в фоне (без перезагрузки чата)
        loadConversations();
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Автообновление каждые 5 секунд (незаметно)
  useEffect(() => {
    loadConversations();
    
    const interval = setInterval(() => {
      // Тихо обновляем без индикаторов загрузки
      fetch('/api/notifications/conversations')
        .then(response => {
          if (response.ok) {
            return response.json();
          }
        })
        .then(data => {
          if (data) {
            setConversations(data.conversations);
          }
        })
        .catch(() => {
          // Игнорируем ошибки при автообновлении
        });
      
      // Если открыт чат, тихо обновляем и его
      if (selectedChat) {
        fetch(`/api/notifications/chat/${selectedChat.client.id}`)
          .then(response => {
            if (response.ok) {
              return response.json();
            }
          })
          .then(data => {
            if (data) {
              setSelectedChat(data);
            }
          })
          .catch(() => {
            // Игнорируем ошибки при автообновлении
          });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedChat]);

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: ru });
    } catch {
      return '';
    }
  };

  // Форматирование даты для разделителей
  const formatDateSeparator = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Сброс времени для корректного сравнения
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

      if (messageDate.getTime() === todayDate.getTime()) {
        return 'Сегодня';
      } else if (messageDate.getTime() === yesterdayDate.getTime()) {
        return 'Вчера';
      } else {
        return format(date, 'd MMMM yyyy', { locale: ru });
      }
    } catch {
      return '';
    }
  };

  // Группировка сообщений по датам
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';
    let currentGroup: ChatMessage[] = [];

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  // Прокрутка вниз к последнему сообщению (только внутри контейнера чата)
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Прокрутка при загрузке чата или добавлении сообщений
  useEffect(() => {
    if (selectedChat && selectedChat.messages.length > 0) {
      setTimeout(scrollToBottom, 100); // Небольшая задержка для рендеринга
    }
  }, [selectedChat?.messages.length]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM', { locale: ru });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Загрузка уведомлений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 lg:p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6 h-full">
          {/* Список разговоров */}
          <div className={`col-span-1 lg:col-span-1 lg:bg-gray-800 lg:rounded-xl overflow-hidden ${showChatOnMobile ? 'hidden lg:block' : 'block'}`}>
            <div className="p-3 lg:border-b lg:border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Разговоры ({conversations.length})
              </h2>
            </div>
            
            <div 
              className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
              style={{ height: 'calc(100vh - 200px)' }}
            >
              {conversations.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Нет сообщений</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.clientId}
                    onClick={() => loadChat(conversation.clientId)}
                    className={`w-full p-3 lg:border-b lg:border-gray-700 hover:bg-gray-700 lg:hover:shadow-lg lg:transform lg:hover:scale-[1.02] transition-all duration-200 text-left ${
                      selectedChat?.client.id === conversation.clientId ? 'lg:bg-gray-750 lg:border-l-4 lg:border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Аватар */}
                      <div className="flex-shrink-0 relative">
                        {conversation.clientPhoto ? (
                          <img
                            src={conversation.clientPhoto}
                            alt={conversation.clientName}
                            className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUserProfile(conversation.clientId);
                            }}
                          />
                        ) : (
                          <div 
                            className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUserProfile(conversation.clientId);
                            }}
                          >
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>

                      {/* Информация */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-white font-medium truncate">
                            {conversation.clientName}
                          </h3>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(conversation.lastMessageTime)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-1">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">{conversation.clientPhone}</span>
                        </div>

                        <p className={`text-sm truncate ${
                          conversation.lastMessageFromUser && conversation.unreadCount > 0
                            ? 'text-blue-300 font-medium'
                            : 'text-gray-400'
                        }`}>
                          {conversation.lastMessageFromUser ? 'Клиент: ' : 'Вы: '}
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Чат */}
          <div className={`col-span-1 lg:col-span-2 lg:bg-gray-800 lg:rounded-xl ${!showChatOnMobile ? 'hidden lg:block' : 'block'}`}>
            {selectedChat ? (
              <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
                {/* Заголовок чата */}
                <div className="p-3 lg:border-b lg:border-gray-700 flex items-center space-x-3 flex-shrink-0">
                  {/* Кнопка назад для мобильных */}
                  <button
                    onClick={backToChats}
                    className="lg:hidden mr-2 p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  {selectedChat.client.photoUrl ? (
                    <img
                      src={selectedChat.client.photoUrl}
                      alt={selectedChat.client.fullName}
                      className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openUserProfile(selectedChat.client.id)}
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
                      onClick={() => openUserProfile(selectedChat.client.id)}
                    >
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openUserProfile(selectedChat.client.id)}
                  >
                    <h3 className="text-white font-medium text-sm">{selectedChat.client.fullName}</h3>
                    <p className="text-xs text-gray-400">{selectedChat.client.phone}</p>
                  </div>
                </div>

                {/* Сообщения */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-3"
                >
                  {isChatLoading ? (
                    <div className="flex justify-center items-center h-20">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : selectedChat.messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-4">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Начните разговор</p>
                    </div>
                  ) : (
                    groupMessagesByDate(selectedChat.messages).map((group, groupIndex) => (
                      <div key={groupIndex}>
                        {/* Разделитель даты */}
                        <div className="flex justify-center my-6">
                          <div className="bg-gray-600/50 text-gray-300 text-xs px-4 py-2 rounded-full shadow-sm backdrop-blur-sm">
                            {formatDateSeparator(group.messages[0].createdAt)}
                          </div>
                        </div>
                        
                        {/* Сообщения этой даты */}
                        {group.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex mb-3 px-2 lg:px-0 ${message.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm ${
                                message.senderRole === 'admin'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 lg:bg-gray-700 text-gray-100'
                              }`}
                            >
                              <p className="text-sm">{message.message}</p>
                              <p className={`text-xs mt-1 ${
                                message.senderRole === 'admin' ? 'text-blue-200' : 'text-gray-400'
                              }`}>
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                  {/* Элемент для прокрутки в конец */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Ввод сообщения */}
                <div className="p-3 lg:border-t lg:border-gray-700 flex-shrink-0">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Напишите сообщение..."
                      className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed text-sm"
                    >
                      {isSending ? 'Отправка...' : 'Отправить'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="hidden lg:flex items-center justify-center"
                style={{ height: 'calc(100vh - 180px)' }}
              >
                <div className="text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <h3 className="text-base font-medium mb-2">Выберите разговор</h3>
                  <p className="text-sm">Выберите клиента из списка слева, чтобы начать общение</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>

      {/* Профиль пользователя */}
      {selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          isOpen={showUserProfile}
          onClose={() => {
            setShowUserProfile(false);
            setSelectedUserId(null);
          }}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
