/**
 * Словари приложения.
 *
 * Чтобы добавить статус, услугу, канал или тип контакта — допиши строку
 * в нужный массив. Ничего больше менять не нужно: экраны, фильтры и форма
 * строятся из этих списков. Старые записи с неизвестным id не ломаются:
 * для них показывается сам id (см. функции find*).
 */

import type { ChannelId, ContactTypeId, ServiceId, SiteState, SourceId, StatusId } from './client';

export type Tone = 'neutral' | 'positive' | 'danger' | 'accent';

export interface StatusDef {
  id: StatusId;
  label: string;
  tone: Tone;
  /** короткая подпись в форме — когда ставить этот статус */
  hint?: string;
}

/**
 * Воронка из эфира про поиск клиентов: сообщение → открыл → ответил →
 * созвон → оплата. Первые четыре id остались от первой версии приложения,
 * поэтому старые карточки открываются без миграции.
 */
export const STATUSES: StatusDef[] = [
  { id: 'not_written', label: 'Не писала', tone: 'neutral', hint: 'контакт собран, сообщение ещё не ушло' },
  { id: 'written', label: 'Написала', tone: 'accent', hint: 'сообщение отправлено, ответа нет' },
  { id: 'opened', label: 'Открыл, молчит', tone: 'neutral', hint: 'две галочки, но тишина' },
  { id: 'replied', label: 'Ответил', tone: 'positive', hint: 'диалог пошёл' },
  { id: 'later', label: 'Рано', tone: 'neutral', hint: 'ответил, но сейчас не готов' },
  { id: 'call_set', label: 'Созвон назначен', tone: 'accent', hint: 'дата и время согласованы' },
  { id: 'call_done', label: 'Созвон прошёл', tone: 'accent', hint: 'поговорили, ждём решения' },
  { id: 'won', label: 'Купил', tone: 'positive', hint: 'оплата получена' },
  { id: 'declined', label: 'Отказ', tone: 'danger', hint: 'сказал «нет» или закрыл диалог' },
];

export const DEFAULT_STATUS: StatusId = 'not_written';

/** Статусы, в которых человек уже ответил — из них считаются диалоги */
export const ANSWERED_STATUSES: StatusId[] = ['replied', 'later', 'call_set', 'call_done', 'won'];

/** Человек точно прочитал сообщение: либо отметили вручную, либо ответил */
export const OPENED_STATUSES: StatusId[] = ['opened', ...ANSWERED_STATUSES];

/** Созвон назначен (или уже прошёл, или дело дошло до оплаты) */
export const CALL_SET_STATUSES: StatusId[] = ['call_set', 'call_done', 'won'];

/** Созвон реально состоялся */
export const CALL_DONE_STATUSES: StatusId[] = ['call_done', 'won'];

export interface ServiceDef {
  id: ServiceId;
  label: string;
}

export const SERVICES: ServiceDef[] = [
  { id: 'site', label: 'Сайт' },
  { id: 'landing', label: 'Лендинг' },
  { id: 'redesign', label: 'Редизайн' },
  { id: 'bot', label: 'Telegram-бот' },
  { id: 'miniapp', label: 'Mini App' },
  { id: 'booking', label: 'Онлайн-запись' },
  { id: 'geo', label: 'Карточка на картах' },
  { id: 'other', label: 'Другое' },
];

export interface ChannelDef {
  id: ChannelId;
  label: string;
}

/** Куда писали. По этим строкам считается статистика открываемости */
export const CHANNELS: ChannelDef[] = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'vk', label: 'ВКонтакте' },
  { id: 'avito', label: 'Авито' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email', label: 'Почта' },
  { id: 'call', label: 'Звонок' },
];

export interface SourceDef {
  id: SourceId;
  label: string;
}

/** Где нашла человека — это же идёт в первое сообщение строкой «нашла вас на…» */
export const SOURCES: SourceDef[] = [
  { id: 'yandex_maps', label: 'Яндекс Карты' },
  { id: '2gis', label: '2ГИС' },
  { id: 'avito', label: 'Авито' },
  { id: 'vk_group', label: 'Сообщество ВК' },
  { id: 'tg_chat', label: 'Чат в Телеграме' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'setka', label: 'Сетка' },
  { id: 'tenchat', label: 'TenChat' },
  { id: 'conference', label: 'Конференция' },
  { id: 'their_site', label: 'Их сайт' },
  { id: 'referral', label: 'Рекомендация' },
  { id: 'other', label: 'Другое' },
];

export interface ContactTypeDef {
  id: ContactTypeId;
  label: string;
  placeholder: string;
  inputMode?: 'tel' | 'text' | 'url';
}

export const CONTACT_TYPES: ContactTypeDef[] = [
  { id: 'phone', label: 'Телефон', placeholder: '+7 900 000-00-00', inputMode: 'tel' },
  { id: 'telegram', label: 'Telegram', placeholder: '@ник или ссылка' },
  { id: 'whatsapp', label: 'WhatsApp', placeholder: '+7 900 000-00-00', inputMode: 'tel' },
  { id: 'instagram', label: 'Instagram', placeholder: '@ник' },
  { id: 'vk', label: 'VK', placeholder: 'vk.com/…' },
  { id: 'website', label: 'Сайт', placeholder: 'example.ru', inputMode: 'url' },
  { id: '2gis', label: '2ГИС', placeholder: 'ссылка на карточку', inputMode: 'url' },
  { id: 'other', label: 'Ссылка', placeholder: 'любая ссылка', inputMode: 'url' },
];

/** Телефон вынесен отдельным полем в начало формы, поэтому здесь — Telegram */
export const DEFAULT_CONTACT_TYPE: ContactTypeId = 'telegram';

export interface SiteDef {
  id: SiteState;
  label: string;
  /** подпись в карточке; null — не показываем тег вовсе */
  tag: string | null;
  tone: Tone;
}

export const SITE_STATES: SiteDef[] = [
  { id: 'yes', label: 'Есть', tag: 'Есть сайт', tone: 'positive' },
  { id: 'no', label: 'Нет', tag: 'Сайта нет', tone: 'danger' },
  { id: 'unknown', label: 'Не знаю', tag: null, tone: 'neutral' },
];

// --- Поиск по словарям с мягким запасным вариантом ---

export function findStatus(id: StatusId): StatusDef {
  return STATUSES.find((s) => s.id === id) ?? { id, label: id, tone: 'neutral' };
}

export function findService(id: ServiceId): ServiceDef {
  return SERVICES.find((s) => s.id === id) ?? { id, label: id };
}

export function findChannel(id: ChannelId): ChannelDef {
  return CHANNELS.find((c) => c.id === id) ?? { id, label: id };
}

export function findSource(id: SourceId): SourceDef {
  return SOURCES.find((s) => s.id === id) ?? { id, label: id };
}

export function findContactType(id: ContactTypeId): ContactTypeDef {
  return CONTACT_TYPES.find((c) => c.id === id) ?? { id, label: id, placeholder: '' };
}

export function findSite(id: SiteState): SiteDef {
  return SITE_STATES.find((s) => s.id === id) ?? SITE_STATES[2];
}
