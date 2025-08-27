-- Добавляем тестовый тариф, если его нет
INSERT INTO tariffs (name, price, duration_days, duration, freeze_limit, start_time, end_time)
SELECT 
  'Премиум',
  20000.00,
  100,
  3,
  14,
  '06:00',
  '23:00'
WHERE NOT EXISTS (SELECT 1 FROM tariffs WHERE name = 'Премиум');

-- Добавляем тестового клиента, если его нет
INSERT INTO clients (full_name, phone, telegram_id)
SELECT 
  'Ариет Сапарбек уулу',
  '+996700123456',
  '123456789'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE telegram_id = '123456789');

-- Добавляем активный абонемент для тестирования
INSERT INTO subscriptions (client_id, tariff_id, start_date, end_date, status, freeze_used, remaining_days)
SELECT 
  c.id,
  t.id,
  '2024-06-01'::date,
  '2024-09-01'::date,
  'active',
  0,
  85
FROM clients c, tariffs t
WHERE c.telegram_id = '123456789' 
AND t.name = 'Премиум'
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s 
  WHERE s.client_id = c.id AND s.status = 'active'
);

-- Добавляем несколько завершенных абонементов для истории
INSERT INTO subscriptions (client_id, tariff_id, start_date, end_date, status, freeze_used, remaining_days)
SELECT 
  c.id,
  t.id,
  '2024-01-01'::date,
  '2024-04-01'::date,
  'completed',
  5,
  0
FROM clients c, tariffs t
WHERE c.telegram_id = '123456789' 
AND t.name = 'Премиум'
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s 
  WHERE s.client_id = c.id AND s.start_date = '2024-01-01'::date
);

INSERT INTO subscriptions (client_id, tariff_id, start_date, end_date, status, freeze_used, remaining_days)
SELECT 
  c.id,
  t.id,
  '2023-10-01'::date,
  '2024-01-01'::date,
  'completed',
  2,
  0
FROM clients c, tariffs t
WHERE c.telegram_id = '123456789' 
AND t.name = 'Премиум'
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s 
  WHERE s.client_id = c.id AND s.start_date = '2023-10-01'::date
);

-- Добавляем несколько посещений
INSERT INTO visits (client_id, subscription_id, visit_date, qr_code)
SELECT 
  c.id,
  s.id,
  '2024-06-15'::date,
  'QR_TEST_001'
FROM clients c 
JOIN subscriptions s ON s.client_id = c.id
WHERE c.telegram_id = '123456789' 
AND s.status = 'active'
AND NOT EXISTS (SELECT 1 FROM visits WHERE qr_code = 'QR_TEST_001');

-- Проверяем результат
SELECT 
  c.full_name,
  c.telegram_id,
  COUNT(s.id) as total_subscriptions,
  COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions
FROM clients c
LEFT JOIN subscriptions s ON s.client_id = c.id
WHERE c.telegram_id = '123456789'
GROUP BY c.id, c.full_name, c.telegram_id;
