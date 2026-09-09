/**
 * Тестовые данные для локальной разработки.
 *
 * В браузере открой консоль и выполни:
 *   __seedDemo()      — добавит несколько клиентов
 *   __seedDemo(300)   — добавит 300 записей, чтобы проверить скорость списка
 *   __clearAll()      — удалит всё
 *
 * В боевой сборке этот файл не подключается.
 */

import { createClient, type Client } from '../domain/client';
import { shiftedISO } from '../domain/dates';
import { saveClient, deleteClient, loadAll } from '../storage/clientsRepo';
import { useClients } from '../store/clientsStore';

const SAMPLES: Partial<Client>[] = [
  {
    name: 'Буревестник',
    niche: 'База отдыха',
    city: 'Ростов-на-Дону',
    site: 'no',
    status: 'not_written',
    services: ['site', 'booking'],
    note: 'Хорошие соцсети, бронирование только через сообщения.',
    contacts: [{ id: 'k1', type: 'phone', value: '+7 863 000-11-22', label: 'Ирина, админ' }],
  },
  {
    name: 'Мята',
    niche: 'Салон красоты',
    city: 'Обнинск',
    site: 'yes',
    status: 'written',
    favorite: true,
    services: ['redesign', 'booking'],
    note: 'Интересовалась отдельным лендингом.',
    remindAt: shiftedISO(0),
    contacts: [{ id: 'k2', type: 'telegram', value: '@myata_salon' }],
  },
  {
    name: 'Coffee Point',
    niche: 'Кофейня',
    city: 'Обнинск',
    site: 'no',
    status: 'not_written',
    services: ['landing', 'bot'],
    note: 'Активный Instagram, можно предложить сайт с доставкой.',
    remindAt: shiftedISO(-3),
  },
  {
    name: 'Радуга',
    niche: 'Детский центр',
    city: 'Сочи',
    site: 'yes',
    status: 'replied',
    services: ['miniapp', 'booking'],
    note: 'Рассматривают мини-приложение для записи на занятия.',
    remindAt: shiftedISO(9),
  },
  {
    name: 'Оргтехник',
    niche: 'Ремонт техники',
    city: 'Обнинск',
    site: 'yes',
    status: 'declined',
    services: ['redesign'],
    note: 'Пока не готовы, вернуться осенью.',
  },
];

async function seedDemo(count?: number): Promise<void> {
  const list: Client[] = [];

  for (const sample of SAMPLES) list.push(createClient(sample));

  if (count && count > SAMPLES.length) {
    const cities = ['Обнинск', 'Калуга', 'Сочи', 'Ростов-на-Дону', 'Москва'];
    const niches = ['Кофейня', 'Автосервис', 'Салон', 'Клиника', 'База отдыха'];
    for (let i = list.length; i < count; i += 1) {
      list.push(
        createClient({
          name: `Клиент ${i + 1}`,
          niche: niches[i % niches.length],
          city: cities[i % cities.length],
          site: i % 3 === 0 ? 'no' : i % 3 === 1 ? 'yes' : 'unknown',
          status: ['not_written', 'written', 'replied', 'declined'][i % 4],
          note: 'Запись для проверки скорости списка.',
        }),
      );
    }
  }

  for (const client of list) await saveClient(client);
  await useClients.getState().load();
  console.info(`Добавлено записей: ${list.length}`);
}

async function clearAll(): Promise<void> {
  const list = await loadAll();
  for (const client of list) await deleteClient(client.id);
  await useClients.getState().load();
  console.info(`Удалено записей: ${list.length}`);
}

declare global {
  interface Window {
    __seedDemo?: typeof seedDemo;
    __clearAll?: typeof clearAll;
  }
}

window.__seedDemo = seedDemo;
window.__clearAll = clearAll;
