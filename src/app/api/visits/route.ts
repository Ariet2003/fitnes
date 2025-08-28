import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { telegramService } from '@/lib/telegram';

// Функция для расчета диапазона дат с учетом временной зоны +6
function getTodayDateRange() {
  const now = new Date();
  // Текущая дата в +6 часовом поясе
  const currentTimeWithOffset = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  
  // Начало сегодняшнего дня в +6 часовом поясе
  const todayStart = new Date(currentTimeWithOffset.getFullYear(), currentTimeWithOffset.getMonth(), currentTimeWithOffset.getDate());
  const todayStartWithOffset = new Date(todayStart.getTime() + 6 * 60 * 60 * 1000);
  
  // Начало завтрашнего дня в +6 часовом поясе  
  const tomorrowStart = new Date(todayStartWithOffset);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  
  console.log('📅 Date range calculation:');
  console.log('  Current local time:', now.toISOString());
  console.log('  Current time +6:', currentTimeWithOffset.toISOString());
  console.log('  Today start +6:', todayStartWithOffset.toISOString());
  console.log('  Tomorrow start +6:', tomorrowStart.toISOString());
  
  return {
    offsetTime: todayStartWithOffset,
    tomorrow: tomorrowStart
  };
}

// Функция для отправки уведомления о скором окончании посещений
async function sendRemainingVisitsNotification(client: any, remainingDays: number, endDate: Date) {
  if (!client.telegramId) {
    return;
  }

  try {
    let message = '';
    const endDateStr = endDate.toLocaleDateString('ru-RU');
    
    if (remainingDays === 3) {
      message = `🔔 *Уведомление о скором окончании абонемента*

Уважаемый ${client.fullName}!

После сегодняшнего посещения у вас останется всего *3 посещения*. 
📅 Ваш абонемент действует до ${endDateStr}.

💡 Рекомендуем заранее позаботиться о продлении абонемента, чтобы не прерывать тренировки!`;

    } else if (remainingDays === 2) {
      message = `🔔 *Внимание! Осталось 2 посещения*

${client.fullName}, после сегодняшнего посещения у вас останется только *2 посещения*.
📅 Абонемент действует до ${endDateStr}.

⚠️ Рекомендуем приобрести новый абонемент сразу после окончания текущего!`;

            } else if (remainingDays === 1) {
          message = `🚨 *ОСТАЛОСЬ ПОСЛЕДНЕЕ ПОСЕЩЕНИЕ!*

${client.fullName}, после сегодняшнего посещения у вас останется только *1 посещение*!
📅 Ваш абонемент действует до ${endDateStr}.

🔥 *ВАЖНО!* Сразу после окончания текущего абонемента купите новый, чтобы продолжить тренировки без перерыва.

Свяжитесь с администратором для оформления нового абонемента! 💪`;
    }

    if (message) {
      const result = await telegramService.sendMessage(client.telegramId, message, {
        parse_mode: 'Markdown'
      });

      if (result.ok) {
        console.log(`✅ Уведомление отправлено клиенту ${client.fullName} (${client.telegramId}) о ${remainingDays} оставшихся посещениях`);
      } else {
        console.error(`❌ Ошибка отправки уведомления клиенту ${client.fullName}:`, result.description);
      }
    }
  } catch (error) {
    console.error('Ошибка при отправке уведомления о посещениях:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { telegramId } = await request.json();

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID обязателен' },
        { status: 400 }
      );
    }

    // Найдем клиента по telegram ID
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: {
            tariff: true
          },
          orderBy: { endDate: 'desc' }
        }
      }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Клиент не найден в системе',
        errorType: 'CLIENT_NOT_FOUND'
      });
    }

    // Проверим активные абонементы
    const activeSubscription = client.subscriptions[0];
    
    if (!activeSubscription) {
      return NextResponse.json({
        success: false,
          error: 'У клиента нет активного абонемента',
          errorType: 'NO_ACTIVE_SUBSCRIPTION',
          client: {
            id: client.id,
            fullName: client.fullName,
            phone: client.phone
          }
        });
      }

      // Проверим срок действия абонемента
    const now = new Date();
    if (now > activeSubscription.endDate) {
      // Автоматически завершаем абонемент если срок истек
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: 'completed'
        }
      });
      
      console.log(`Абонемент ${activeSubscription.id} автоматически завершен - истек срок действия (endDate: ${activeSubscription.endDate})`);
      
      return NextResponse.json({
        success: false,
        error: 'Срок действия абонемента истек',
        errorType: 'SUBSCRIPTION_EXPIRED',
        client: {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone
        },
        subscription: {
          endDate: activeSubscription.endDate,
          tariffName: activeSubscription.tariff.name
        }
      });
    }

    // Проверим рабочие часы фитнес-клуба
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour + currentMinutes / 60;
    
    const startTime = parseFloat(activeSubscription.tariff.startTime.replace(':', '.'));
    const endTime = parseFloat(activeSubscription.tariff.endTime.replace(':', '.'));
    
    if (currentTime < startTime || currentTime > endTime) {
      return NextResponse.json({
        success: false,
        error: `У вас доступ открыт с ${activeSubscription.tariff.startTime} до ${activeSubscription.tariff.endTime}`,
        errorType: 'OUTSIDE_WORKING_HOURS',
        client: {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone
        },
        workingHours: {
          start: activeSubscription.tariff.startTime,
          end: activeSubscription.tariff.endTime
        }
      });
    }

    // Проверим, не было ли уже посещения сегодня (с учетом временной зоны +6)
    const { offsetTime, tomorrow } = getTodayDateRange();

    const todayVisit = await prisma.visit.findFirst({
      where: {
        clientId: client.id,
        subscriptionId: activeSubscription.id,
        visitDate: {
          gte: offsetTime,
          lt: tomorrow
        }
      }
    });

    // Проверяем статус абонемента (заморожен ли)
    const isFrozen = activeSubscription.status === 'frozen';
    
    // Проверяем, есть ли замороженное посещение на сегодня
    const todayFrozenVisit = await prisma.visit.findFirst({
      where: {
        clientId: client.id,
        subscriptionId: activeSubscription.id,
        visitDate: {
          gte: offsetTime,
          lt: tomorrow
        },
        isFreezeDay: true
      }
    });

    if (todayVisit && !todayFrozenVisit) {
      return NextResponse.json({
        success: false,
        error: 'Посещение на сегодня уже отмечено',
        errorType: 'ALREADY_VISITED_TODAY',
        client: {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone,
          photoUrl: client.photoUrl
        },
        subscription: {
          id: activeSubscription.id,
          tariffName: activeSubscription.tariff.name,
          endDate: activeSubscription.endDate,
          remainingDays: activeSubscription.remainingDays,
          freezeUsed: activeSubscription.freezeUsed,
          freezeLimit: activeSubscription.tariff.freezeLimit,
          status: activeSubscription.status
        },
        visitTime: todayVisit.visitDate
      });
    }

    // Все проверки пройдены, возвращаем информацию для подтверждения
    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        photoUrl: client.photoUrl
      },
      subscription: {
        id: activeSubscription.id,
        tariffName: activeSubscription.tariff.name,
        endDate: activeSubscription.endDate,
        remainingDays: activeSubscription.remainingDays,
        freezeUsed: activeSubscription.freezeUsed,
        freezeLimit: activeSubscription.tariff.freezeLimit,
        status: activeSubscription.status
      },
      workingHours: {
        start: activeSubscription.tariff.startTime,
        end: activeSubscription.tariff.endTime
      },
      canFreeze: activeSubscription.freezeUsed < activeSubscription.tariff.freezeLimit,
      isFrozenToday: !!todayFrozenVisit,
      canUnfreeze: !!todayFrozenVisit && currentTime < endTime
    });

  } catch (error) {
    console.error('Ошибка при валидации посещения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Подтверждение посещения
export async function PUT(request: NextRequest) {
  try {
    const { telegramId } = await request.json();

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID обязателен' },
        { status: 400 }
      );
    }

    // Повторяем проверки
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: {
            tariff: true
          },
          orderBy: { endDate: 'desc' }
        }
      }
    });

    if (!client || !client.subscriptions[0]) {
      return NextResponse.json(
        { error: 'Клиент или абонемент не найден' },
        { status: 400 }
      );
    }

    const activeSubscription = client.subscriptions[0];

    // Проверим срок действия абонемента
    const now = new Date();
    if (now > activeSubscription.endDate) {
      // Автоматически завершаем абонемент если срок истек
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: 'completed'
        }
      });
      
      console.log(`Абонемент ${activeSubscription.id} автоматически завершен при попытке отметки - истек срок действия (endDate: ${activeSubscription.endDate})`);
      
      return NextResponse.json(
        { error: 'Срок действия абонемента истек' },
        { status: 400 }
      );
    }

    // Проверим, не было ли уже посещения сегодня (с учетом временной зоны +6)
    const { offsetTime, tomorrow } = getTodayDateRange();

    const todayVisit = await prisma.visit.findFirst({
      where: {
        clientId: client.id,
        subscriptionId: activeSubscription.id,
        visitDate: {
          gte: offsetTime,
          lt: tomorrow
        }
      }
    });

    if (todayVisit) {
      return NextResponse.json(
        { error: 'Посещение на сегодня уже отмечено' },
        { status: 400 }
      );
    }

    // Создаем запись о посещении
    // Создаем время посещения с учетом временной зоны +6
    const visitDateTime = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
    
    const visit = await prisma.visit.create({
      data: {
        clientId: client.id,
        subscriptionId: activeSubscription.id,
        visitDate: visitDateTime,
        qrCode: `${telegramId}_${Date.now()}`, // Уникальный QR код для каждого посещения
        isFreezeDay: false
      }
    });

    // Уменьшаем количество оставшихся дней
    if (activeSubscription.remainingDays > 0) {
      // Отправляем уведомление ПЕРЕД уменьшением, если после этого посещения останется 3, 2 или 1 день
      const remainingAfterVisit = activeSubscription.remainingDays - 1;
      if (remainingAfterVisit <= 3 && remainingAfterVisit > 0) {
        await sendRemainingVisitsNotification(client, remainingAfterVisit, activeSubscription.endDate);
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          remainingDays: {
            decrement: 1
          }
        }
      });

      // Если остался 0 дней, завершаем абонемент
      if (updatedSubscription.remainingDays === 0) {
        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: {
            status: 'completed'
          }
        });
        console.log(`Абонемент ${activeSubscription.id} автоматически завершен - закончились посещения`);
      }
    }

    return NextResponse.json({
      success: true,
      visit: {
        id: visit.id,
        visitDate: visit.visitDate
      },
      client: {
        id: client.id,
        fullName: client.fullName
      }
    });

  } catch (error) {
    console.error('Ошибка при создании посещения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Заморозка дня
export async function PATCH(request: NextRequest) {
  try {
    const { telegramId, action } = await request.json();

    if (!telegramId || !action) {
      return NextResponse.json(
        { error: 'Telegram ID и действие обязательны' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { tariff: true },
          orderBy: { endDate: 'desc' }
        }
      }
    });

    if (!client || !client.subscriptions[0]) {
      return NextResponse.json(
        { error: 'Клиент или абонемент не найден' },
        { status: 400 }
      );
    }

    const activeSubscription = client.subscriptions[0];
    
    // Проверим срок действия абонемента
    const now = new Date();
    if (now > activeSubscription.endDate) {
      // Автоматически завершаем абонемент если срок истек
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: 'completed'
        }
      });
      
      console.log(`Абонемент ${activeSubscription.id} автоматически завершен при попытке заморозки/разморозки - истек срок действия (endDate: ${activeSubscription.endDate})`);
      
      return NextResponse.json(
        { error: 'Срок действия абонемента истек' },
        { status: 400 }
      );
    }
    
    // Применяем временную зону +6
    const { offsetTime, tomorrow } = getTodayDateRange();

    if (action === 'freeze') {
      // Проверяем лимит заморозки
      if (activeSubscription.freezeUsed >= activeSubscription.tariff.freezeLimit) {
        return NextResponse.json({
          success: false,
          error: 'Исчерпан лимит дней заморозки'
        });
      }

      // Создаем запись заморозки с учетом временной зоны +6
      const freezeDateTime = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
      
      await prisma.visit.create({
        data: {
          clientId: client.id,
          subscriptionId: activeSubscription.id,
          visitDate: freezeDateTime,
          qrCode: `${telegramId}_freeze_${Date.now()}`, // Уникальный QR код для заморозки
          isFreezeDay: true
        }
      });

      // Увеличиваем счетчик использованных дней заморозки
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          freezeUsed: {
            increment: 1
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'День заморожен'
      });

    } else if (action === 'unfreeze') {
      // Находим запись заморозки на сегодня
      const frozenVisit = await prisma.visit.findFirst({
        where: {
          clientId: client.id,
          subscriptionId: activeSubscription.id,
                  visitDate: {
          gte: offsetTime,
          lt: tomorrow
        },
          isFreezeDay: true
        }
      });

      if (!frozenVisit) {
        return NextResponse.json({
          success: false,
          error: 'Заморозка на сегодня не найдена'
        });
      }

      // Удаляем запись заморозки
      await prisma.visit.delete({
        where: { id: frozenVisit.id }
      });

      // Уменьшаем счетчик использованных дней заморозки
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          freezeUsed: {
            decrement: 1
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Заморозка снята'
      });
    }

    return NextResponse.json(
      { error: 'Неизвестное действие' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Ошибка при работе с заморозкой:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
