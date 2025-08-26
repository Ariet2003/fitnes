'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, User, MessageSquare, RefreshCw, Timer } from 'lucide-react';

export default function LoginForm() {
  const [step, setStep] = useState<'login' | 'verification'>('login');
  const [formData, setFormData] = useState({ login: '', password: '' });
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeTimer, setCodeTimer] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Таймеры
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (codeTimer > 0) {
      interval = setInterval(() => {
        setCodeTimer(prev => prev - 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [codeTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: formData.login,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка авторизации');
      }

      setStep('verification');
      setCodeTimer(300); // 5 минут
      setResendTimer(120); // 2 минуты
      
      // Фокус на первое поле кода после перехода
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (code?: string) => {
    const verificationCode = code || codeDigits.join('');
    
    if (verificationCode.length !== 6) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();
      console.log('[CLIENT] Ответ от сервера:', data);

      if (!response.ok) {
        console.log('[CLIENT] Ошибка ответа:', response.status, data.error);
        throw new Error(data.error || 'Ошибка верификации');
      }

      // Проверяем успешность операции
      if (data.success) {
        console.log('[CLIENT] Верификация успешна, выполняем редирект');
        // Делаем небольшую задержку для установки куков
        setTimeout(() => {
          console.log('[CLIENT] Выполняем редирект на страницу клиентов');
          window.location.href = '/dashboard/clients';
        }, 100);
      } else {
        throw new Error('Неожиданный ответ от сервера');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
      // Очищаем поля кода при ошибке
      setCodeDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resend', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка повторной отправки');
      }

      setCodeTimer(300); // 5 минут
      setResendTimer(120); // 2 минуты
      setCodeDigits(['', '', '', '', '', '']);
      
      // Фокус на первое поле после переотправки
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleCodeDigitChange = (index: number, value: string) => {
    if (value.length > 1) return; // Только одна цифра
    if (value !== '' && !/^\d$/.test(value)) return; // Только цифры

    const newDigits = [...codeDigits];
    newDigits[index] = value;
    setCodeDigits(newDigits);
    setError('');

    // Автофокус на следующее поле
    if (value !== '' && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Автоматическая отправка когда все поля заполнены
    if (value !== '' && index === 5) {
      const finalCode = newDigits.join('');
      if (finalCode.length === 6 && !loading) {
        setTimeout(() => {
          handleVerification(finalCode);
        }, 100); // Небольшая задержка для лучшего UX
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace - переход к предыдущему полю
    if (e.key === 'Backspace' && codeDigits[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Вставка из буфера
    if (e.key === 'v' && e.ctrlKey) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newDigits = [...codeDigits];
        digits.forEach((digit, i) => {
          if (i + index < 6) {
            newDigits[i + index] = digit;
          }
        });
        setCodeDigits(newDigits);
        
        // Фокус на последнее заполненное поле
        const lastFilledIndex = Math.min(index + digits.length - 1, 5);
        inputRefs.current[lastFilledIndex]?.focus();

        // Автоматическая отправка если все поля заполнены
        if (newDigits.every(digit => digit !== '') && !loading) {
          setTimeout(() => {
            handleVerification(newDigits.join(''));
          }, 200);
        }
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Логотип и заголовок */}
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 'login' ? 'Вход в систему' : 'Подтверждение'}
            </h1>
            <p className="text-gray-400 text-sm">
              {step === 'login' 
                ? 'Введите ваши данные для входа' 
                : 'Введите код из Telegram'
              }
            </p>
          </div>

          {/* Форма входа */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Логин
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) => handleInputChange('login', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Введите логин"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Введите пароль"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Войти</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Форма верификации */}
          {step === 'verification' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                
                {/* Таймер действия кода */}
                {codeTimer > 0 && (
                  <div className="flex items-center justify-center space-x-2 text-blue-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>Код действителен: {formatTime(codeTimer)}</span>
                  </div>
                )}
                
                {codeTimer === 0 && (
                  <p className="text-red-400 text-sm">Код истек</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
                  Введите 6-значный код
                </label>
                
                {/* Отдельные поля для цифр */}
                <div className="flex justify-center space-x-3 mb-4">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => {
                        if (el) {
                          inputRefs.current[index] = el;
                        }
                      }}
                      type="text"
                      value={digit}
                      onChange={(e) => handleCodeDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      className={`w-12 h-12 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      maxLength={1}
                      autoComplete="off"
                      disabled={loading || codeTimer === 0}
                    />
                  ))}
                </div>
                
                {/* Индикатор загрузки */}
                {loading && (
                  <div className="flex items-center justify-center space-x-2 text-blue-400 text-sm mt-4">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span>Проверяем код...</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {/* Кнопка повторной отправки */}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    {resendTimer > 0 
                      ? `Повторить через ${resendTimer}с` 
                      : 'Отправить код повторно'
                    }
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setCodeTimer(0);
                    setResendTimer(0);
                    setCodeDigits(['', '', '', '', '', '']);
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Назад
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
