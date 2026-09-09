/**
 * Telegram CloudStorage.
 *
 * Данные лежат на серверах Telegram и привязаны к паре «пользователь + бот»,
 * то есть доступны только владельцу и переживают переустановку Telegram.
 * Отдельная авторизация и свой сервер для этого не нужны.
 *
 * Ограничения платформы: до 1024 ключей, ключ до 128 символов
 * (только латиница, цифры, «_» и «-»), значение до 4096 символов.
 */

import { tg } from '../app/telegram';
import { chunk, type KeyValueStorage } from './adapter';

export const CLOUD_VALUE_LIMIT = 4096;

function promisify<T>(run: (cb: (error: string | null, result?: T) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      run((error, result) => {
        if (error) reject(new Error(error));
        else resolve(result as T);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export const cloudStorage: KeyValueStorage = {
  kind: 'cloud',

  getKeys() {
    return promisify<string[]>((cb) => tg!.CloudStorage.getKeys(cb)).then((keys) => keys ?? []);
  },

  async getItems(keys) {
    const result: Record<string, string> = {};
    // запрашиваем пачками, чтобы не упереться в лимит длины запроса
    for (const part of chunk(keys, 40)) {
      const items = await promisify<Record<string, string>>((cb) =>
        tg!.CloudStorage.getItems(part, cb),
      );
      Object.assign(result, items ?? {});
    }
    return result;
  },

  setItem(key, value) {
    if (value.length > CLOUD_VALUE_LIMIT) {
      return Promise.reject(
        new Error('Запись слишком длинная — сократи заметку и сохрани ещё раз.'),
      );
    }
    return promisify<boolean>((cb) => tg!.CloudStorage.setItem(key, value, cb)).then(() => undefined);
  },

  removeItem(key) {
    return promisify<boolean>((cb) => tg!.CloudStorage.removeItem(key, cb)).then(() => undefined);
  },
};
