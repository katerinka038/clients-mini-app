/** Работа с датами напоминаний. Формат хранения — YYYY-MM-DD (местная дата). */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function shiftedISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export type ReminderBucket = 'today' | 'overdue' | 'later';

export function bucketOf(iso: string, today = todayISO()): ReminderBucket {
  if (iso === today) return 'today';
  return iso < today ? 'overdue' : 'later';
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** «12 марта» или «12 марта 2027 г.», если год не текущий */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date().getFullYear();
  return sameYear ? dayMonth.format(date) : dayMonthYear.format(date);
}

/** Человеческая подпись: «сегодня», «завтра», «вчера» или дата */
export function formatReminder(iso: string): string {
  if (iso === todayISO()) return 'сегодня';
  if (iso === shiftedISO(1)) return 'завтра';
  if (iso === shiftedISO(-1)) return 'вчера';
  return formatDate(iso);
}
