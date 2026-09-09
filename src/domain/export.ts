/**
 * Выгрузка списка клиентов в таблицу.
 *
 * Формат — CSV с точкой с запятой: так файл открывается двойным кликом
 * в русском Excel и в Google Таблицах. В начало добавлен BOM, иначе Excel
 * показывает кириллицу «кракозябрами».
 *
 * Фото в выгрузку не попадают — это текстовая копия данных.
 */

import type { Client } from './client';
import { findContactType, findService, findSite, findStatus } from './dictionaries';
import { formatDate } from './dates';

const COLUMNS = [
  'Название',
  'Ниша',
  'Город',
  'Сайт',
  'Статус',
  'Телефон',
  'Другие контакты',
  'Что предложить',
  'Заметка',
  'Напоминание',
  'Избранное',
  'Добавлен',
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
        findSite(client.site).label,
        findStatus(client.status).label,
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

export function exportFileName(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `клиенты-${date}.csv`;
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
