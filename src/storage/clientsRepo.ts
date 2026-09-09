/**
 * Репозиторий клиентов: чтение, запись и удаление.
 *
 * Один клиент — один ключ вида `cl_<id>`. Так изменение одной карточки
 * пишет ровно одну запись, а не весь список целиком.
 *
 * Дополнительно список дублируется в localStorage как быстрый кэш:
 * при открытии приложения он показывается мгновенно, пока идёт
 * запрос в облако.
 */

import { hasCloudStorage } from '../app/telegram';
import { normalizeClient, type Client } from '../domain/client';
import type { KeyValueStorage } from './adapter';
import { cloudStorage } from './cloudStorage';
import { localStorageAdapter } from './localStorage';

const KEY_PREFIX = 'cl_';
const CACHE_KEY = 'clients:cache:v1';

export const storage: KeyValueStorage = hasCloudStorage ? cloudStorage : localStorageAdapter;

export const storageKind = storage.kind;

function keyOf(id: string): string {
  return KEY_PREFIX + id;
}

// --- Быстрый кэш ---

export function readCache(): Client[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeClient).filter((c): c is Client => c !== null);
  } catch {
    return [];
  }
}

export function writeCache(list: Client[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    /* приватный режим или переполнение — не критично */
  }
}

// --- Операции ---

export async function loadAll(): Promise<Client[]> {
  const keys = (await storage.getKeys()).filter((k) => k.startsWith(KEY_PREFIX));
  if (keys.length === 0) return [];

  const items = await storage.getItems(keys);
  const clients: Client[] = [];

  for (const raw of Object.values(items)) {
    if (!raw) continue;
    try {
      const client = normalizeClient(JSON.parse(raw));
      if (client) clients.push(client);
    } catch {
      // битую запись пропускаем, остальное должно открыться
    }
  }

  return clients;
}

export async function saveClient(client: Client): Promise<void> {
  await storage.setItem(keyOf(client.id), JSON.stringify(client));
}

export async function deleteClient(id: string): Promise<void> {
  await storage.removeItem(keyOf(id));
}
