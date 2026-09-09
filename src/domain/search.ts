/**
 * Поиск и сортировка списка клиентов.
 *
 * Строка поиска для каждого клиента считается один раз и кэшируется
 * по паре id + updatedAt — поэтому список из нескольких сотен записей
 * фильтруется без заметной задержки.
 */

import type { Client } from './client';

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

interface CacheEntry {
  updatedAt: number;
  text: string;
  digits: string;
}

const cache = new Map<string, CacheEntry>();

function indexOf(client: Client): CacheEntry {
  const cached = cache.get(client.id);
  if (cached && cached.updatedAt === client.updatedAt) return cached;

  const parts = [client.name, client.niche, client.city, client.note];
  for (const contact of client.contacts) {
    parts.push(contact.value);
    if (contact.label) parts.push(contact.label);
  }

  const text = normalizeText(parts.join(' '));
  const digits = digitsOnly(client.contacts.map((c) => c.value).join(' '));

  const entry: CacheEntry = { updatedAt: client.updatedAt, text, digits };
  cache.set(client.id, entry);
  return entry;
}

export function forgetFromCache(id: string): void {
  cache.delete(id);
}

/** Совпадает ли клиент с поисковым запросом */
export function matchesQuery(client: Client, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;

  const entry = indexOf(client);
  if (entry.text.includes(q)) return true;

  // поиск по телефону: «900 000» найдёт «+7 (900) 000-00-00»
  const qDigits = digitsOnly(q);
  if (qDigits.length >= 3 && entry.digits.includes(qDigits)) return true;

  return false;
}

/** Избранные выше, затем более недавно добавленные */
export function sortClients(list: Client[]): Client[] {
  return [...list].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.name.localeCompare(b.name, 'ru');
  });
}

export interface FilterOptions {
  query: string;
  /** id статуса или 'all' */
  status: string;
}

export function filterClients(list: Client[], { query, status }: FilterOptions): Client[] {
  return list.filter((client) => {
    if (status !== 'all' && client.status !== status) return false;
    return matchesQuery(client, query);
  });
}
