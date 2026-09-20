/**
 * Выгрузка в таблицу: список клиентов и сводка по воронке.
 *
 * Формат — CSV с точкой с запятой: так файл открывается двойным кликом
 * в русском Excel и в Google Таблицах. В начало добавлен BOM, иначе Excel
 * показывает кириллицу «кракозябрами».
 *
 * Фото в выгрузку не попадают — это текстовая копия данных.
 */

import type { Client } from './client';
import {
  findChannel,
  findContactType,
  findService,
  findSite,
  findSource,
  findStatus,
} from './dictionaries';
import { formatDate } from './dates';
import { adviceFor, funnelByChannel, funnelByNiche, totalRow, type FunnelRow } from './funnel';

const COLUMNS = [
  'Название',
  'Ниша',
  'Город',
  'Кто решает',
  'Должность',
  'Канал',
  'Где нашла',
  'Зацепка',
  'Сайт',
  'Статус',
  'Первое сообщение',
  'Прочитал',
  'Напоминаний',
  'Сумма',
  'Телефон',
  'Другие контакты',
  'Что предложить',
  'Заметка',
  'Напоминание',
  'Избранное',
  'Добавлен',
];

const SUMMARY_COLUMNS = [
  'Срез',
  'Касаний',
  'Открыли',
  'Открыли, %',
  'Ответили',
  'Ответили, %',
  'Отказов',
  'Созвонов назначено',
  'Созвонов прошло',
  'Оплат',
  'Сумма',
  'Что делать',
];

function cell(value: string): string {
  const clean = value.replace(/\r?\n/g, ' ').trim();
  // кавычки внутри значения удваиваются — так требует формат
  return `"${clean.replace(/"/g, '""')}"`;
}

function contactsText(client: Client, skipFirstPhone: boolean): string {
  const phone = client.contacts.find((c) => c.type === 'phone');
  return client.contacts
    .filter((c) => !(skipFirstPhone && c.id === phone?.id))
    .map((c) => {
      const type = findContactType(c.type).label;
      return c.label ? `${type}: ${c.value} (${c.label})` : `${type}: ${c.value}`;
    })
    .join('; ');
}

export function clientsToCsv(clients: Client[]): string {
  const rows = [COLUMNS.map(cell).join(';')];

  for (const client of clients) {
    const phone = client.contacts.find((c) => c.type === 'phone');
    rows.push(
      [
        client.name,
        client.niche,
        client.city,
        client.decisionMaker,
        client.role,
        client.channel ? findChannel(client.channel).label : '',
        client.source ? findSource(client.source).label : '',
        client.hook,
        findSite(client.site).label,
        findStatus(client.status).label,
        client.firstTouchAt ? formatDate(client.firstTouchAt) : '',
        client.opened ? 'да' : '',
        client.pings.length > 0 ? String(client.pings.length) : '',
        client.amount > 0 ? String(client.amount) : '',
        phone?.value ?? '',
        contactsText(client, true),
        client.services.map((s) => findService(s).label).join(', '),
        client.note,
        client.remindAt ? formatDate(client.remindAt) : '',
        client.favorite ? 'да' : '',
        new Date(client.createdAt).toLocaleDateString('ru-RU'),
      ]
        .map(cell)
        .join(';'),
    );
  }

  return '﻿' + rows.join('\r\n');
}

function summaryRow(row: FunnelRow): string {
  return [
    row.label,
    String(row.touched),
    String(row.opened),
    String(Math.round(row.openRate * 100)),
    String(row.answered),
    String(Math.round(row.answerRate * 100)),
    String(row.declined),
    String(row.callsSet),
    String(row.callsDone),
    String(row.won),
    row.amount > 0 ? String(row.amount) : '',
    adviceFor(row).text,
  ]
    .map(cell)
    .join(';');
}

/**
 * Сводка воронки: сначала общая строка, потом разбивка по нишам
 * и по каналам. Это и есть таблица, которую просят приложить к заданию.
 */
export function summaryToCsv(clients: Client[]): string {
  const rows: string[] = [SUMMARY_COLUMNS.map(cell).join(';')];

  rows.push(summaryRow(totalRow(clients)));

  const niches = funnelByNiche(clients);
  if (niches.length > 0) {
    rows.push('');
    rows.push(cell('Ниши'));
    for (const row of niches) rows.push(summaryRow(row));
  }

  const channels = funnelByChannel(clients);
  if (channels.length > 0) {
    rows.push('');
    rows.push(cell('Каналы'));
    for (const row of channels) rows.push(summaryRow(row));
  }

  return '﻿' + rows.join('\r\n');
}

function dateStamp(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

export function exportFileName(): string {
  return `клиенты-${dateStamp()}.csv`;
}

export function summaryFileName(): string {
  return `цифры-${dateStamp()}.csv`;
}

/** Скачивание файла. В Telegram на iPhone может быть запрещено системой. */
export function downloadCsv(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Копирование в буфер обмена — запасной путь, работает везде */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}
