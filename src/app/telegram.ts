/**
 * Тонкая обёртка над Telegram WebApp.
 *
 * Приложение должно работать и вне Telegram — в обычном браузере при
 * локальной разработке. Поэтому все вызовы защищены проверками.
 */

type CloudCallback<T> = (error: string | null, result?: T) => void;

interface TgCloudStorage {
  setItem(key: string, value: string, cb?: CloudCallback<boolean>): void;
  getItem(key: string, cb: CloudCallback<string>): void;
  getItems(keys: string[], cb: CloudCallback<Record<string, string>>): void;
  removeItem(key: string, cb?: CloudCallback<boolean>): void;
  removeItems(keys: string[], cb?: CloudCallback<boolean>): void;
  getKeys(cb: CloudCallback<string[]>): void;
}

interface TgBackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

interface TgHaptic {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; username?: string } };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  ready(): void;
  expand(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  showConfirm(message: string, cb: (ok: boolean) => void): void;
  showAlert(message: string, cb?: () => void): void;
  disableVerticalSwipes?(): void;
  BackButton: TgBackButton;
  HapticFeedback: TgHaptic;
  CloudStorage: TgCloudStorage;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const tg: TelegramWebApp | undefined =
  typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export const isInsideTelegram = Boolean(tg && tg.platform && tg.platform !== 'unknown');

function versionAtLeast(version: string): boolean {
  try {
    return Boolean(tg?.isVersionAtLeast(version));
  } catch {
    return false;
  }
}

/** CloudStorage появился в Bot API 6.9 */
export const hasCloudStorage = Boolean(tg?.CloudStorage) && versionAtLeast('6.9');

/** Подготовка окна: цвета, разворот на весь экран */
export function initTelegram(): void {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (versionAtLeast('6.1')) {
      tg.setHeaderColor('#eae6df');
      tg.setBackgroundColor('#eae6df');
    }
    // случайный свайп вниз не должен закрывать приложение во время заполнения формы
    if (versionAtLeast('7.7')) tg.disableVerticalSwipes?.();
  } catch {
    /* вне Telegram — молча пропускаем */
  }
}

// --- Кнопка «назад» ---

export function showBackButton(handler: () => void): () => void {
  if (!tg?.BackButton) return () => {};
  tg.BackButton.onClick(handler);
  tg.BackButton.show();
  return () => {
    tg.BackButton.offClick(handler);
    tg.BackButton.hide();
  };
}

// --- Мелочи ---

export function haptic(kind: 'tap' | 'success' | 'warning' | 'select' = 'tap'): void {
  const h = tg?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === 'tap') h.impactOccurred('light');
    else if (kind === 'select') h.selectionChanged();
    else h.notificationOccurred(kind === 'success' ? 'success' : 'warning');
  } catch {
    /* не критично */
  }
}

/** Подтверждение: нативное в Telegram, обычное — в браузере */
export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (tg?.showConfirm && versionAtLeast('6.2')) {
      try {
        tg.showConfirm(message, (ok) => resolve(ok));
        return;
      } catch {
        /* падаем в обычный confirm */
      }
    }
    resolve(window.confirm(message));
  });
}

export function setClosingConfirmation(enabled: boolean): void {
  if (!tg || !versionAtLeast('6.2')) return;
  try {
    if (enabled) tg.enableClosingConfirmation();
    else tg.disableClosingConfirmation();
  } catch {
    /* не критично */
  }
}
