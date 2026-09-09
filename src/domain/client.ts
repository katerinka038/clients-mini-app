/**
 * Модель клиента.
 *
 * Правила расширения на будущее:
 *  - статусы, услуги и типы контактов — это строковые id из словарей
 *    (см. dictionaries.ts). Добавить новый — значит дописать строку в словарь,
 *    старые записи при этом не ломаются;
 *  - неизвестные поля из старых/новых версий не теряются: они лежат в `extra`;
 *  - у каждой записи есть номер схемы `v`, по нему работает миграция.
 */

export const CLIENT_SCHEMA_VERSION = 1;

/** Есть ли у клиента сайт */
export type SiteState = 'yes' | 'no' | 'unknown';

/** id из словаря статусов, например 'not_written' */
export type StatusId = string;

/** id из словаря услуг, например 'landing' */
export type ServiceId = string;

/** id из словаря типов контактов, например 'telegram' */
export type ContactTypeId = string;

export interface Contact {
  id: string;
  type: ContactTypeId;
  /** сам контакт: номер, ник, ссылка */
  value: string;
  /** необязательное имя человека или подпись */
  label?: string;
}

export interface Client {
  id: string;
  /** версия схемы записи */
  v: number;

  name: string;
  niche: string;
  city: string;
  site: SiteState;

  contacts: Contact[];
  services: ServiceId[];
  status: StatusId;
  note: string;

  /** дата «вернуться к клиенту», формат YYYY-MM-DD */
  remindAt: string | null;

  favorite: boolean;

  createdAt: number;
  updatedAt: number;

  /** место для будущих полей; при чтении сюда попадает всё незнакомое */
  extra: Record<string, unknown>;
}

const KNOWN_FIELDS = new Set([
  'id',
  'v',
  'name',
  'niche',
  'city',
  'site',
  'contacts',
  'services',
  'status',
  'note',
  'remindAt',
  'favorite',
  'createdAt',
  'updatedAt',
  'extra',
]);

/** id, безопасный для ключей Telegram CloudStorage: только буквы, цифры и «_» */
export function makeId(prefix = 'c'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}_${rand}`;
}

/** Пустой клиент с разумными значениями по умолчанию */
export function createClient(patch: Partial<Client> = {}): Client {
  const now = Date.now();
  return {
    id: makeId(),
    v: CLIENT_SCHEMA_VERSION,
    name: '',
    niche: '',
    city: '',
    site: 'unknown',
    contacts: [],
    services: [],
    status: 'not_written',
    note: '',
    remindAt: null,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    extra: {},
    ...patch,
  };
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeContacts(raw: unknown): Contact[] {
  if (!Array.isArray(raw)) return [];
  const result: Contact[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const value = str(c.value).trim();
    const label = str(c.label).trim();
    if (!value && !label) continue;
    result.push({
      id: str(c.id) || makeId('k'),
      type: str(c.type, 'other'),
      value,
      ...(label ? { label } : {}),
    });
  }
  return result;
}

/**
 * Приводит запись из хранилища к актуальной модели.
 * Возвращает null, если это вообще не клиент.
 */
export function normalizeClient(raw: unknown): Client | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name).trim();
  const id = str(r.id);
  if (!id || !name) return null;

  const site = r.site;
  const now = Date.now();

  // всё незнакомое сохраняем, чтобы не потерять данные будущих версий
  const extra: Record<string, unknown> = {
    ...(r.extra && typeof r.extra === 'object' ? (r.extra as Record<string, unknown>) : {}),
  };
  for (const key of Object.keys(r)) {
    if (!KNOWN_FIELDS.has(key)) extra[key] = r[key];
  }

  return {
    id,
    v: CLIENT_SCHEMA_VERSION,
    name,
    niche: str(r.niche).trim(),
    city: str(r.city).trim(),
    site: site === 'yes' || site === 'no' ? site : 'unknown',
    contacts: normalizeContacts(r.contacts),
    services: Array.isArray(r.services) ? r.services.filter((s): s is string => typeof s === 'string') : [],
    status: str(r.status, 'not_written') || 'not_written',
    note: str(r.note),
    remindAt: /^\d{4}-\d{2}-\d{2}$/.test(str(r.remindAt)) ? str(r.remindAt) : null,
    favorite: r.favorite === true,
    createdAt: num(r.createdAt, now),
    updatedAt: num(r.updatedAt, num(r.createdAt, now)),
    extra,
  };
}

/** Данные формы, из которых собирается клиент */
export type ClientDraft = Omit<Client, 'id' | 'v' | 'createdAt' | 'updatedAt' | 'extra'>;

export function draftFromClient(client: Client): ClientDraft {
  return {
    name: client.name,
    niche: client.niche,
    city: client.city,
    site: client.site,
    contacts: client.contacts.map((c) => ({ ...c })),
    services: [...client.services],
    status: client.status,
    note: client.note,
    remindAt: client.remindAt,
    favorite: client.favorite,
  };
}

export function emptyDraft(): ClientDraft {
  return draftFromClient(createClient());
}
