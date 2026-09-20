/**
 * Воронка касаний и цифры, по которым видно, что чинить.
 *
 * Считаем ровно то, что просят на курсе: касаний, открыли, ответили,
 * созвоны и оплаты — в разрезе ниши и канала. Ничего не храним отдельно:
 * все числа выводятся из карточек клиентов, поэтому сходятся всегда.
 */

import type { Client } from './client';
import {
  ANSWERED_STATUSES,
  CALL_DONE_STATUSES,
  CALL_SET_STATUSES,
  OPENED_STATUSES,
  findChannel,
} from './dictionaries';
import { todayISO } from './dates';

/** Сколько сообщений в день держим по методу */
export const DAILY_TARGET = 20;

/** Сколько касаний нужно, чтобы цифры вообще что-то значили */
export const MIN_SAMPLE = 20;

/** Сотня касаний на нишу — после неё можно судить, та ли она */
export const NICHE_SAMPLE = 100;

/** Нижняя граница нормальной открываемости */
export const OPEN_RATE_GOOD = 0.35;

/** Ниже этого — дело не в тексте, а в канале */
export const OPEN_RATE_BAD = 0.1;

/** Ответов меньше — значит не цепляют первые две строки */
export const ANSWER_RATE_BAD = 0.05;

export function isTouched(client: Client): boolean {
  return client.status !== 'not_written' || client.firstTouchAt !== null;
}

export function isOpened(client: Client): boolean {
  return client.opened || OPENED_STATUSES.includes(client.status);
}

export function isAnswered(client: Client): boolean {
  return ANSWERED_STATUSES.includes(client.status);
}

export function isDeclined(client: Client): boolean {
  return client.status === 'declined';
}

export function isCallSet(client: Client): boolean {
  return CALL_SET_STATUSES.includes(client.status);
}

export function isCallDone(client: Client): boolean {
  return CALL_DONE_STATUSES.includes(client.status);
}

export function isWon(client: Client): boolean {
  return client.status === 'won';
}

export interface FunnelRow {
  key: string;
  label: string;
  touched: number;
  opened: number;
  answered: number;
  declined: number;
  callsSet: number;
  callsDone: number;
  won: number;
  amount: number;
  /** открыли, но не ответили ни «да», ни «нет» */
  silent: number;
  /** доля открывших от касаний, 0…1 */
  openRate: number;
  /** доля ответивших от касаний, 0…1 */
  answerRate: number;
  /** доля оплат от касаний, 0…1 */
  winRate: number;
}

function emptyRow(key: string, label: string): FunnelRow {
  return {
    key,
    label,
    touched: 0,
    opened: 0,
    answered: 0,
    declined: 0,
    callsSet: 0,
    callsDone: 0,
    won: 0,
    amount: 0,
    silent: 0,
    openRate: 0,
    answerRate: 0,
    winRate: 0,
  };
}

function addTo(row: FunnelRow, client: Client): void {
  if (!isTouched(client)) return;
  row.touched += 1;
  if (isOpened(client)) row.opened += 1;
  if (isAnswered(client)) row.answered += 1;
  if (isDeclined(client)) row.declined += 1;
  if (isCallSet(client)) row.callsSet += 1;
  if (isCallDone(client)) row.callsDone += 1;
  if (isWon(client)) {
    row.won += 1;
    row.amount += client.amount;
  }
}

function withRates(row: FunnelRow): FunnelRow {
  return {
    ...row,
    // столбец из таблицы Димы: прочитал и не сказал ни «да», ни «нет»
    silent: Math.max(0, row.opened - row.answered - row.declined),
    openRate: row.touched > 0 ? row.opened / row.touched : 0,
    answerRate: row.touched > 0 ? row.answered / row.touched : 0,
    winRate: row.touched > 0 ? row.won / row.touched : 0,
  };
}

/** Общая строка по всем клиентам */
export function totalRow(clients: Client[]): FunnelRow {
  const row = emptyRow('all', 'Всего');
  for (const client of clients) addTo(row, client);
  return withRates(row);
}

/**
 * Разбивка по произвольному признаку. Пустое значение признака попадает
 * в строку «не указано» — так видно, где карточки недозаполнены.
 */
function groupBy(
  clients: Client[],
  keyOf: (client: Client) => string,
  labelOf: (key: string) => string,
): FunnelRow[] {
  const rows = new Map<string, FunnelRow>();

  for (const client of clients) {
    if (!isTouched(client)) continue;
    const key = keyOf(client).trim();
    const id = key || '—';
    let row = rows.get(id);
    if (!row) {
      row = emptyRow(id, key ? labelOf(key) : 'Не указано');
      rows.set(id, row);
    }
    addTo(row, client);
  }

  return [...rows.values()].map(withRates).sort((a, b) => b.touched - a.touched);
}

export function funnelByNiche(clients: Client[]): FunnelRow[] {
  return groupBy(
    clients,
    (c) => c.niche,
    (key) => key,
  );
}

export function funnelByChannel(clients: Client[]): FunnelRow[] {
  return groupBy(
    clients,
    (c) => c.channel,
    (key) => findChannel(key).label,
  );
}

export type AdviceTone = 'neutral' | 'warn' | 'good';

export interface Advice {
  tone: AdviceTone;
  text: string;
}

/**
 * Правило починки из эфира: меняем по одному. Сначала канал, потом первые
 * две строки, потом нишу.
 */
export function adviceFor(row: FunnelRow): Advice {
  if (row.touched === 0) {
    return { tone: 'neutral', text: 'Касаний ещё не было' };
  }
  if (row.touched < MIN_SAMPLE) {
    return {
      tone: 'neutral',
      text: `Мало данных: ${row.touched} из ${MIN_SAMPLE}. Выводы делать рано, пиши дальше`,
    };
  }
  if (row.openRate < OPEN_RATE_BAD) {
    return { tone: 'warn', text: 'Открывают меньше 10% — меняй канал, текст пока не трогай' };
  }
  if (row.openRate < OPEN_RATE_GOOD) {
    return { tone: 'warn', text: 'Открываемость ниже нормы — перепиши первые две строки' };
  }
  if (row.answerRate < ANSWER_RATE_BAD) {
    return { tone: 'warn', text: 'Открывают, но молчат — меняй первые две строки' };
  }
  if (row.touched < NICHE_SAMPLE) {
    return {
      tone: 'good',
      text: `Идёт нормально — добери до ${NICHE_SAMPLE} касаний и сравнивай ниши`,
    };
  }
  if (row.won === 0) {
    return { tone: 'warn', text: 'Диалоги есть, продаж нет — дело в созвоне, а не в переписке' };
  }
  return { tone: 'good', text: 'Цифры в норме — так и держи' };
}

export interface DayProgress {
  /** сколько первых сообщений ушло сегодня */
  touches: number;
  /** сколько напоминаний о себе сделано сегодня */
  pings: number;
  /** сколько осталось до дневной нормы */
  left: number;
  target: number;
}

export function todayProgress(clients: Client[], today = todayISO()): DayProgress {
  let touches = 0;
  let pings = 0;

  for (const client of clients) {
    if (client.firstTouchAt === today) touches += 1;
    if (client.pings.includes(today)) pings += 1;
  }

  return {
    touches,
    pings,
    left: Math.max(0, DAILY_TARGET - touches),
    target: DAILY_TARGET,
  };
}

/** Кому пора напомнить о себе: написали, но ответа нет, и пинга давно не было */
export function needsPing(client: Client, today = todayISO()): boolean {
  if (!isTouched(client)) return false;
  if (isAnswered(client) || isDeclined(client)) return false;

  const last = client.pings.length > 0 ? client.pings[client.pings.length - 1] : client.firstTouchAt;
  if (!last) return false;
  return last < today;
}

/** Рубли без копеек, с пробелами: «45 000 ₽» */
export function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

/** Доля в процентах: 0.482 → «48%» */
export function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Склонение существительного при числе: 1 касание, 2 касания, 5 касаний */
export function plural(count: number, forms: [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const tail = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (tail > 1 && tail < 5) return forms[1];
  if (tail === 1) return forms[0];
  return forms[2];
}

/** Формы слова «касание» для подписи под числом */
export const TOUCH_FORMS: [string, string, string] = ['касание', 'касания', 'касаний'];
