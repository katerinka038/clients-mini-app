/**
 * Фото клиентов.
 *
 * Лежат отдельными записями `ph_<id>`, а не внутри карточки клиента:
 * так фото не съедает лимит длины самой записи, а изменение заметки
 * не переписывает картинку.
 *
 * Важно: каждое фото занимает одну из 1024 доступных записей Telegram.
 */

import { CLOUD_VALUE_LIMIT } from './cloudStorage';
import { storage } from './clientsRepo';

const PHOTO_PREFIX = 'ph_';
const CACHE_KEY = 'clients:photos:v1';

export type PhotoMap = Record<string, string>;

function keyOf(clientId: string): string {
  return PHOTO_PREFIX + clientId;
}

export function readPhotoCache(): PhotoMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PhotoMap) : {};
  } catch {
    return {};
  }
}

export function writePhotoCache(photos: PhotoMap): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(photos));
  } catch {
    /* переполнение кэша не должно ломать приложение */
  }
}

export async function loadAllPhotos(): Promise<PhotoMap> {
  const keys = (await storage.getKeys()).filter((k) => k.startsWith(PHOTO_PREFIX));
  if (keys.length === 0) return {};

  const items = await storage.getItems(keys);
  const photos: PhotoMap = {};
  for (const [key, value] of Object.entries(items)) {
    if (value) photos[key.slice(PHOTO_PREFIX.length)] = value;
  }
  return photos;
}

export async function savePhoto(clientId: string, dataUrl: string): Promise<void> {
  if (dataUrl.length > CLOUD_VALUE_LIMIT) {
    throw new Error('Фото не помещается в хранилище. Выбери другое.');
  }
  await storage.setItem(keyOf(clientId), dataUrl);
}

export async function deletePhoto(clientId: string): Promise<void> {
  await storage.removeItem(keyOf(clientId));
}
