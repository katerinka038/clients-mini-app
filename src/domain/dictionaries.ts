/**
 * Словари приложения.
 *
 * Чтобы добавить статус, услугу или тип контакта — допиши строку в нужный
 * массив. Ничего больше менять не нужно: экраны, фильтры и форма строятся
 * из этих списков. Старые записи с неизвестным id не ломаются: для них
 * показывается сам id (см. функции find*).
 */

import type { ContactTypeId, ServiceId, SiteState, StatusId } from './client';

export type Tone = 'neutral' | 'positive' | 'danger' | 'accent';

export interface StatusDef {
  id: StatusId;
  label: string;
  tone: Tone;
}

export const STATUSES: StatusDef[] = [
  { id: 'not_written', label: 'Не писала', tone: 'neutral' },
  { id: 'written', label: 'Написала', tone: 'accent' },
  { id: 'replied', label: 'Ответил', tone: 'positive' },
  { id: 'declined', label: 'Отказ', tone: 'danger' },
];

export const DEFAULT_STATUS: StatusId = 'not_written';

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

export function findContactType(id: ContactTypeId): ContactTypeDef {
  return CONTACT_TYPES.find((c) => c.id === id) ?? { id, label: id, placeholder: '' };
}

export function findSite(id: SiteState): SiteDef {
  return SITE_STATES.find((s) => s.id === id) ?? SITE_STATES[2];
}
