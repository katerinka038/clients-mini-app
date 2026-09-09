/**
 * Общий интерфейс хранилища «ключ — значение».
 *
 * Две реализации: Telegram CloudStorage (боевая) и localStorage
 * (локальная разработка в браузере). Репозиторий работает только
 * с этим интерфейсом, поэтому позже сюда же можно подставить бэкенд.
 */

export interface KeyValueStorage {
  /** название реализации — показываем в интерфейсе, когда нужно предупредить */
  readonly kind: 'cloud' | 'local';
  getKeys(): Promise<string[]>;
  getItems(keys: string[]): Promise<Record<string, string>>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}
