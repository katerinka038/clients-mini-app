/**
 * Хранилище браузера. Нужно, чтобы приложение можно было открыть
 * и потестировать вне Telegram. Данные лежат только в этом браузере.
 */

import type { KeyValueStorage } from './adapter';

const NS = 'clients:';

export const localStorageAdapter: KeyValueStorage = {
  kind: 'local',

  async getKeys() {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NS)) keys.push(key.slice(NS.length));
    }
    return keys;
  },

  async getItems(keys) {
    const result: Record<string, string> = {};
    for (const key of keys) {
      const value = localStorage.getItem(NS + key);
      if (value !== null) result[key] = value;
    }
    return result;
  },

  async setItem(key, value) {
    localStorage.setItem(NS + key, value);
  },

  async removeItem(key) {
    localStorage.removeItem(NS + key);
  },
};
