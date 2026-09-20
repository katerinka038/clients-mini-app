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

import { createClient, type Client, type StatusId } from '../domain/client';
import { shiftedISO } from '../domain/dates';
import { saveClient, deleteClient, loadAll } from '../storage/clientsRepo';
import { useClients } from '../store/clientsStore';
import { clientsToCsv, summaryToCsv } from '../domain/export';

const SAMPLES: Partial<Client>[] = [
  {
    name: 'Буревестник',
    niche: 'База отдыха',
    city: 'Ростов-на-Дону',
    site: 'no',
    status: 'not_written',
    services: ['site', 'booking'],
    source: 'yandex_maps',
    hook: 'Бронирование только через сообщения',
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
    channel: 'telegram',
    source: '2gis',
    decisionMaker: 'Ольга',
    role: 'владелица',
    firstTouchAt: shiftedISO(-2),
    note: 'Интересовалась отдельным лендингом.',
    remindAt: shiftedISO(0),
    contacts: [{ id: 'k2', type: 'telegram', value: '@myata_salon' }],
  },
  {
    name: 'Coffee Point',
    niche: 'Кофейня',
    city: 'Обнинск',
    site: 'no',
    status: 'opened',
    services: ['landing', 'bot'],
    channel: 'whatsapp',
    source: 'instagram',
    firstTouchAt: shiftedISO(-5),
    opened: true,
    pings: [shiftedISO(-4)],
    hook: 'Сайта нет, вся запись в директе',
    note: 'Активный Instagram, можно предложить сайт с доставкой.',
    remindAt: shiftedISO(-3),
  },
  {
    name: 'Радуга',
    niche: 'Детский центр',
    city: 'Сочи',
    site: 'yes',
    status: 'call_set',
    services: ['miniapp', 'booking'],
    channel: 'telegram',
    source: 'tg_chat',
    decisionMaker: 'Анна',
    role: 'руководитель',
    firstTouchAt: shiftedISO(-8),
    opened: true,
    pings: [shiftedISO(-7), shiftedISO(-4)],
    amount: 60000,
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
    channel: 'avito',
    source: 'avito',
    firstTouchAt: shiftedISO(-12),
    opened: true,
    note: 'Пока не готовы, вернуться осенью.',
  },
];

/**
 * Смесь статусов примерно как в жизни: на двадцать касаний половина
 * открывает, четверть отвечает, один доходит до оплаты.
 */
const FUNNEL_MIX: StatusId[] = [
  'written',
  'written',
  'written',
  'written',
  'written',
  'written',
  'written',
  'written',
  'written',
  'declined',
  'opened',
  'opened',
  'opened',
  'opened',
  'opened',
  'replied',
  'replied',
  'later',
  'call_done',
  'won',
];

async function seedDemo(count?: number): Promise<void> {
  const list: Client[] = [];

  for (const sample of SAMPLES) list.push(createClient(sample));

  if (count && count > SAMPLES.length) {
    const cities = ['Обнинск', 'Калуга', 'Сочи', 'Ростов-на-Дону', 'Москва'];
    const niches = ['Кофейня', 'Автосервис', 'Салон', 'Клиника', 'База отдыха'];
    const channels = ['telegram', 'whatsapp', 'vk', 'avito', 'instagram'];
    const sources = ['yandex_maps', '2gis', 'avito', 'tg_chat', 'instagram'];

    for (let i = list.length; i < count; i += 1) {
      const status = FUNNEL_MIX[i % FUNNEL_MIX.length];
      list.push(
        createClient({
          name: `Клиент ${i + 1}`,
          niche: niches[i % niches.length],
          city: cities[i % cities.length],
          site: i % 3 === 0 ? 'no' : i % 3 === 1 ? 'yes' : 'unknown',
          status,
          channel: channels[i % channels.length],
          source: sources[i % sources.length],
          firstTouchAt: shiftedISO(-(i % 10)),
          opened: status !== 'written',
          pings: i % 3 === 0 ? [shiftedISO(-(i % 5))] : [],
          amount: status === 'won' ? 30000 + (i % 4) * 15000 : 0,
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
    __csvSummary?: () => string;
    __csvClients?: () => string;
  }
}

window.__seedDemo = seedDemo;
window.__clearAll = clearAll;

// быстрый просмотр выгрузок прямо из консоли
window.__csvSummary = () => summaryToCsv(useClients.getState().clients);
window.__csvClients = () => clientsToCsv(useClients.getState().clients);
