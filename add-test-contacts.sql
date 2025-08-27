-- Добавляем тестовые контакты, если их нет
INSERT INTO contacts (phone, address, social_links, map_link)
SELECT 
  '+7 (555) 123-45-67',
  'г. Бишкек, ул. Примерная, 123',
  '{"instagram": "https://instagram.com/fitness_club", "vk": "https://vk.com/fitness_club", "telegram": "https://t.me/fitness_club"}',
  'https://maps.google.com/maps?q=42.8746,74.5698'
WHERE NOT EXISTS (SELECT 1 FROM contacts);

-- Проверяем, добавились ли контакты
SELECT * FROM contacts;
