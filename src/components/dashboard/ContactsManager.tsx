'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Phone, Globe, Instagram, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Contact {
  id: number;
  phone: string;
  address: string;
  socialLinks: any;
  mapLink: string;
}

interface ContactFormData {
  phone: string;
  address: string;
  mapLink: string;
  instagram: string;
  vk: string;
  telegram: string;
}

export default function ContactsManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<ContactFormData>({
    phone: '',
    address: '',
    mapLink: '',
    instagram: '',
    vk: '',
    telegram: ''
  });

  const { success, error } = useToast();

  // Загружаем контакты
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      } else {
        error('Ошибка', 'Не удалось загрузить контакты');
      }
    } catch (err) {
      error('Ошибка', 'Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phone: '',
      address: '',
      mapLink: '',
      instagram: '',
      vk: '',
      telegram: ''
    });
    setEditingContact(null);
    setShowForm(false);
  };

  const handleEdit = (contact: Contact) => {
    const socialLinks = contact.socialLinks || {};
    setFormData({
      phone: contact.phone,
      address: contact.address,
      mapLink: contact.mapLink || '',
      instagram: socialLinks.instagram || '',
      vk: socialLinks.vk || '',
      telegram: socialLinks.telegram || ''
    });
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const socialLinks = {
        ...(formData.instagram && { instagram: formData.instagram }),
        ...(formData.vk && { vk: formData.vk }),
        ...(formData.telegram && { telegram: formData.telegram })
      };

      const payload = {
        phone: formData.phone,
        address: formData.address,
        mapLink: formData.mapLink,
        socialLinks
      };

      const url = editingContact 
        ? `/api/contacts/${editingContact.id}`
        : '/api/contacts';
      
      const method = editingContact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        success('Успешно', editingContact ? 'Контакт обновлен' : 'Контакт добавлен');
        await fetchContacts();
        resetForm();
      } else {
        const result = await response.json();
        error('Ошибка', result.error || 'Не удалось сохранить контакт');
      }
    } catch (err) {
      error('Ошибка', 'Ошибка подключения к серверу');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот контакт?')) return;

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        success('Успешно', 'Контакт удален');
        await fetchContacts();
      } else {
        error('Ошибка', 'Не удалось удалить контакт');
      }
    } catch (err) {
      error('Ошибка', 'Ошибка подключения к серверу');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <MapPin className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Контакты и адреса</h2>
            <p className="text-gray-400 text-sm">Управление контактной информацией клуба</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить контакт
        </button>
      </div>

      {/* Список контактов */}
      <div className="space-y-4 mb-6">
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Контакты не найдены</p>
            <p className="text-sm">Добавьте первый контакт клуба</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-green-400" />
                    <span className="text-white font-medium">{contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">{contact.address}</span>
                  </div>
                  {contact.mapLink && (
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <a 
                        href={contact.mapLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Посмотреть на карте
                      </a>
                    </div>
                  )}
                  {contact.socialLinks && (
                    <div className="flex gap-3 mt-2">
                      {contact.socialLinks.instagram && (
                        <a 
                          href={contact.socialLinks.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:text-pink-300"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {contact.socialLinks.vk && (
                        <a 
                          href={contact.socialLinks.vk} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {contact.socialLinks.telegram && (
                        <a 
                          href={contact.socialLinks.telegram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className="border-t border-gray-600 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">
            {editingContact ? 'Редактировать контакт' : 'Добавить новый контакт'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Телефон *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                  placeholder="+996 700 123 456"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Адрес *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                  placeholder="г. Бишкек, ул. Примерная, 123"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ссылка на карту
              </label>
              <input
                type="url"
                value={formData.mapLink}
                onChange={(e) => setFormData(prev => ({ ...prev, mapLink: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.instagram}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                  placeholder="https://instagram.com/..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ВКонтакте
                </label>
                <input
                  type="url"
                  value={formData.vk}
                  onChange={(e) => setFormData(prev => ({ ...prev, vk: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                  placeholder="https://vk.com/..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Telegram
                </label>
                <input
                  type="url"
                  value={formData.telegram}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                  placeholder="https://t.me/..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {editingContact ? 'Обновить' : 'Добавить'}
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
