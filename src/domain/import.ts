/**
 * Разбор списка клиентов, вставленного текстом.
 *
 * Понимает таблицу с точкой с запятой, табуляцией или запятой — то есть
 * и выгрузку самого приложения, и строки, скопированные из Excel или чата.
 * Колонки узнаются по названиям в первой строке; если заголовка нет,
 * считаем порядок: название, ниша, город, канал, контакт, статус.
 *
 * Записи сопоставляются с уже существующими по названию: повторная
 * вставка того же списка не плодит дубли, а обновляет карточки.
 */

import { makeId, type Client, type ClientDraft, type Contact } from './client';
import { CHANNELS, SOURCES, STATUSES, SITE_STATES } from './dictionaries';

export interface ParsedRow {
  /** что показать в предпросмотре */
  name: string;
  /** поля, которые нашлись в строке */
  patch: Partial<ClientDraft>;
  /** id существующей карточки, если такая уже есть */
  existingId?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  added: number;
  updated: number;
  /** строки, которые не получилось разобрать */
  skipped: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RU_DATE = /^(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?$/;

function norm(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function unquote(value: string): string {
  const text = value.trim();
  if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/""/g, '"').trim();
  }
  return text;
}

/** Делит строку по разделителю, уважая кавычки */
function splitLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === sep && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => unquote(c));
}

function detectSeparator(line: string): string {
  const counts = [';', '\t', ','].map((sep) => ({
    sep,
    count: line.split(sep).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].sep : ';';
}

// --- Узнавание колонок ---

type Field =
  | 'name'
  | 'niche'
  | 'city'
  | 'decisionMaker'
  | 'role'
  | 'channel'
  | 'source'
  | 'hook'
  | 'status'
  | 'firstTouchAt'
  | 'opened'
  | 'amount'
  | 'note'
  | 'site'
  | 'phone'
  | 'telegram'
  | 'whatsapp'
  | 'contact';

const HEADERS: { field: Field; words: string[] }[] = [
  { field: 'name', words: ['название', 'компания', 'клиент', 'name', 'кому'] },
  { field: 'niche', words: ['ниша', 'чем занимается', 'сфера'] },
  { field: 'city', words: ['город'] },
  { field: 'decisionMaker', words: ['кто решает', 'лпр', 'имя', 'контактное лицо', 'владелец'] },
  { field: 'role', words: ['должность', 'роль'] },
  { field: 'channel', words: ['канал', 'куда пишу', 'куда писала', 'где пишу'] },
  { field: 'source', words: ['где нашла', 'источник', 'откуда'] },
  { field: 'hook', words: ['зацепка', 'что не так', 'брешь', 'повод'] },
  { field: 'status', words: ['статус'] },
  { field: 'firstTouchAt', words: ['первое сообщение', 'дата', 'когда писала', 'касание'] },
  { field: 'opened', words: ['прочитал', 'открыл', 'открыто'] },
  { field: 'amount', words: ['сумма', 'чек', 'оплата'] },
  { field: 'note', words: ['заметка', 'комментарий', 'примечание'] },
  { field: 'site', words: ['сайт'] },
  { field: 'phone', words: ['телефон', 'номер'] },
  { field: 'telegram', words: ['телеграм', 'telegram', 'тг', 'ник'] },
  { field: 'whatsapp', words: ['whatsapp', 'вотсап', 'ватсап'] },
  { field: 'contact', words: ['контакт', 'другие контакты', 'связь'] },
];

function fieldOf(header: string): Field | null {
  const h = norm(header);
  if (!h) return null;
  for (const { field, words } of HEADERS) {
    if (words.some((w) => h === w || h.startsWith(w))) return field;
  }
  return null;
}

const DEFAULT_ORDER: Field[] = ['name', 'niche', 'city', 'channel', 'contact', 'status'];

function looksLikeHeader(cells: string[]): boolean {
  return cells.some((cell) => {
    const f = fieldOf(cell);
    return f === 'name' || f === 'niche' || f === 'status';
  });
}

// --- Разбор значений ---

function toStatus(value: string): string | undefined {
  const v = norm(value);
  if (!v) return undefined;
  const byLabel = STATUSES.find((s) => norm(s.label) === v);
  if (byLabel) return byLabel.id;
  const byId = STATUSES.find((s) => s.id === v);
  if (byId) return byId.id;
  // частые вольные написания
  if (v.startsWith('напис')) return 'written';
  if (v.startsWith('ответ')) return 'replied';
  if (v.startsWith('отказ') || v.startsWith('нет')) return 'declined';
  if (v.startsWith('куп') || v.startsWith('опла')) return 'won';
  if (v.startsWith('созвон')) return 'call_set';
  if (v.startsWith('молч') || v.startsWith('прочит')) return 'opened';
  return undefined;
}

function toChannel(value: string): string | undefined {
  const v = norm(value);
  if (!v) return undefined;
  const found = CHANNELS.find((c) => norm(c.label) === v || c.id === v);
  if (found) return found.id;
  if (v.startsWith('тел') || v.startsWith('tg')) return 'telegram';
  if (v.startsWith('вот') || v.startsWith('ват') || v.startsWith('wa')) return 'whatsapp';
  if (v.startsWith('вк')) return 'vk';
  if (v.startsWith('авито')) return 'avito';
  if (v.startsWith('инст') || v.startsWith('ig')) return 'instagram';
  return undefined;
}

function toSource(value: string): string | undefined {
  const v = norm(value);
  if (!v) return undefined;
  const found = SOURCES.find((s) => norm(s.label) === v || s.id === v);
  if (found) return found.id;
  if (v.includes('яндекс') || v.includes('карт')) return 'yandex_maps';
  if (v.includes('2гис') || v.includes('2gis')) return '2gis';
  if (v.includes('авито')) return 'avito';
  if (v.includes('чат')) return 'tg_chat';
  return undefined;
}

function toSite(value: string): 'yes' | 'no' | 'unknown' | undefined {
  const v = norm(value);
  if (!v) return undefined;
  const found = SITE_STATES.find((s) => norm(s.label) === v || s.id === v);
  if (found) return found.id;
  if (v.startsWith('есть') || v === 'да') return 'yes';
  if (v.startsWith('нет')) return 'no';
  return undefined;
}

function toDate(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (ISO_DATE.test(v)) return v;

  const m = RU_DATE.exec(v);
  if (!m) return undefined;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = m[3] ? Number(m[3]) : new Date().getFullYear();
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toBool(value: string): boolean | undefined {
  const v = norm(value);
  if (!v) return undefined;
  if (['да', 'yes', '+', '1', 'true', 'прочитал', 'открыл'].includes(v)) return true;
  if (['нет', 'no', '-', '0', 'false'].includes(v)) return false;
  return undefined;
}

function toAmount(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

/** Угадывает тип контакта по тому, как он написан */
function contactFrom(value: string, hint?: 'phone' | 'telegram' | 'whatsapp'): Contact | null {
  const v = value.trim();
  if (!v) return null;

  let type: string = hint ?? 'other';
  if (!hint) {
    if (v.startsWith('@') || v.includes('t.me/')) type = 'telegram';
    else if (/^[+\d][\d\s()\-]{6,}$/.test(v)) type = 'phone';
    else if (v.includes('vk.com')) type = 'vk';
    else if (v.includes('instagram')) type = 'instagram';
    else if (v.includes('2gis')) type = '2gis';
    else if (v.includes('.')) type = 'website';
  }

  return { id: makeId('k'), type, value: v };
}

// --- Основной разбор ---

export function parseClients(text: string, existing: Client[]): ParseResult {
  const clean = text.replace(/^﻿/, '').trim();
  if (!clean) return { rows: [], added: 0, updated: 0, skipped: 0 };

  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { rows: [], added: 0, updated: 0, skipped: 0 };

  const sep = detectSeparator(lines[0]);
  const firstCells = splitLine(lines[0], sep);

  let order: (Field | null)[];
  let startIndex: number;

  if (looksLikeHeader(firstCells)) {
    order = firstCells.map(fieldOf);
    startIndex = 1;
  } else {
    order = DEFAULT_ORDER;
    startIndex = 0;
  }

  const byName = new Map<string, Client>();
  for (const client of existing) byName.set(norm(client.name), client);

  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (let i = startIndex; i < lines.length; i += 1) {
    const cells = splitLine(lines[i], sep);
    const patch: Partial<ClientDraft> = {};
    const contacts: Contact[] = [];
    let name = '';

    cells.forEach((raw, index) => {
      const field = order[index];
      const value = raw.trim();
      if (!field || !value || value === '—' || value === '-') return;

      switch (field) {
        case 'name':
          name = value;
          break;
        case 'niche':
          patch.niche = value;
          break;
        case 'city':
          patch.city = value;
          break;
        case 'decisionMaker':
          patch.decisionMaker = value;
          break;
        case 'role':
          patch.role = value;
          break;
        case 'hook':
          patch.hook = value;
          break;
        case 'note':
          patch.note = value;
          break;
        case 'channel': {
          const channel = toChannel(value);
          if (channel) patch.channel = channel;
          break;
        }
        case 'source': {
          const source = toSource(value);
          if (source) patch.source = source;
          break;
        }
        case 'status': {
          const status = toStatus(value);
          if (status) patch.status = status;
          break;
        }
        case 'site': {
          const site = toSite(value);
          if (site) patch.site = site;
          break;
        }
        case 'firstTouchAt': {
          const date = toDate(value);
          if (date) patch.firstTouchAt = date;
          break;
        }
        case 'opened': {
          const opened = toBool(value);
          if (opened !== undefined) patch.opened = opened;
          break;
        }
        case 'amount': {
          const amount = toAmount(value);
          if (amount !== undefined) patch.amount = amount;
          break;
        }
        case 'phone':
        case 'telegram':
        case 'whatsapp': {
          const contact = contactFrom(value, field);
          if (contact) contacts.push(contact);
          break;
        }
        case 'contact': {
          // в одной ячейке может лежать несколько контактов через «;» или «,»
          for (const part of value.split(/[;,]/)) {
            const contact = contactFrom(part);
            if (contact) contacts.push(contact);
          }
          break;
        }
      }
    });

    if (!name) {
      skipped += 1;
      continue;
    }

    if (contacts.length > 0) patch.contacts = contacts;

    // статус без даты касания: считаем, что написали сегодня — иначе
    // касание не попадёт в цифры
    if (patch.status && patch.status !== 'not_written' && !patch.firstTouchAt) {
      patch.firstTouchAt = new Date().toISOString().slice(0, 10);
    }

    const existingClient = byName.get(norm(name));

    rows.push({
      name,
      patch,
      ...(existingClient ? { existingId: existingClient.id } : {}),
    });
  }

  const updated = rows.filter((r) => r.existingId).length;

  return { rows, added: rows.length - updated, updated, skipped };
}

/**
 * Готовит данные для сохранения: у новой карточки заполняем обязательное
 * имя, у существующей — только те поля, что пришли в строке.
 */
export function draftFor(row: ParsedRow): Partial<ClientDraft> & { name: string } {
  return { ...row.patch, name: row.name };
}

/** Короткое описание строки для предпросмотра */
export function describeRow(row: ParsedRow): string {
  const parts: string[] = [];
  if (row.patch.niche) parts.push(row.patch.niche);
  if (row.patch.channel) {
    const channel = CHANNELS.find((c) => c.id === row.patch.channel);
    if (channel) parts.push(channel.label);
  }
  if (row.patch.status) {
    const status = STATUSES.find((s) => s.id === row.patch.status);
    if (status) parts.push(status.label.toLowerCase());
  }
  return parts.join(' · ');
}
