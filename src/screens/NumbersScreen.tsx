import { useMemo, useState } from 'react';
import { haptic } from '../app/telegram';
import type { Client } from '../domain/client';
import { copyToClipboard, downloadCsv, summaryFileName, summaryToCsv } from '../domain/export';
import {
  DAILY_TARGET,
  MIN_SAMPLE,
  adviceFor,
  formatMoney,
  formatRate,
  funnelByChannel,
  funnelByNiche,
  todayProgress,
  totalRow,
  type Advice,
  type FunnelRow,
} from '../domain/funnel';
import { EmptyState } from '../components/EmptyState';
import { Section } from '../components/Fields';
import { useClients } from '../store/clientsStore';

export function NumbersScreen() {
  const clients = useClients((s) => s.clients);
  const loaded = useClients((s) => s.loaded);

  const total = useMemo(() => totalRow(clients), [clients]);
  const niches = useMemo(() => funnelByNiche(clients), [clients]);
  const channels = useMemo(() => funnelByChannel(clients), [clients]);
  const today = useMemo(() => todayProgress(clients), [clients]);

  const advice = useMemo(() => mainAdvice(total, [...niches, ...channels]), [total, niches, channels]);

  return (
    <div className="screen">
      <header className="head">
        <h1 className="head__title">Цифры</h1>
      </header>

      <DayBar touches={today.touches} pings={today.pings} left={today.left} />

      {total.touched === 0 ? (
        <EmptyState
          title="Касаний пока нет"
          text={
            loaded
              ? 'Поставь клиенту статус «Написала» — и цифры начнут считаться сами.'
              : 'Загружаю…'
          }
        />
      ) : (
        <>
          <Section label="По нишам">
            <FunnelTable head="Ниша" rows={niches} total={total} />
            <div className={`advice advice--${advice.tone}`}>{advice.text}</div>
            {total.amount > 0 && (
              <p className="hint-text">Заработано: {formatMoney(total.amount)}</p>
            )}
          </Section>

          {channels.length > 0 && (
            <Section label="По каналам">
              <FunnelTable head="Канал" rows={channels} />
            </Section>
          )}

          <Section label="Ориентиры">
            <p className="hint-text" style={{ marginTop: 0 }}>
              На сотню касаний: открыли 35–50 %, диалогов 10–20, созвонов 3–5, оплат 1–2.
            </p>
            <p className="hint-text">
              Чиним по&nbsp;одному: сначала канал, потом первые две строки, потом нишу.
            </p>
          </Section>

          <ExportBlock clients={clients} />
        </>
      )}
    </div>
  );
}

/**
 * Одна подсказка на экран вместо плашки под каждой строкой: берём самый
 * весомый затык, а если чинить нечего — общий вывод по всем касаниям.
 */
function mainAdvice(total: FunnelRow, rows: FunnelRow[]): Advice {
  const problems = rows
    .filter((row) => row.touched >= MIN_SAMPLE)
    .map((row) => ({ row, advice: adviceFor(row) }))
    .filter((item) => item.advice.tone === 'warn')
    .sort((a, b) => b.row.touched - a.row.touched);

  if (problems.length > 0) {
    const { row, advice } = problems[0];
    return { tone: advice.tone, text: `${row.label}: ${advice.text.toLowerCase()}` };
  }

  return adviceFor(total);
}

/** Норма дня: двадцать сообщений, плюс напоминания тем, кто молчит */
function DayBar({ touches, pings, left }: { touches: number; pings: number; left: number }) {
  const done = Math.min(1, touches / DAILY_TARGET);

  return (
    <div className="daybar">
      <div className="daybar__top">
        <span className="daybar__title">Сегодня</span>
        <span className="daybar__count">
          {touches} из {DAILY_TARGET}
        </span>
      </div>

      <div className="daybar__track">
        <div className="daybar__fill" style={{ width: `${done * 100}%` }} />
      </div>

      <div className="daybar__sub">
        {left > 0 ? `Осталось написать ${left}` : 'Норма дня закрыта'}
        {pings > 0 && ` · напоминаний ${pings}`}
      </div>
    </div>
  );
}

/**
 * Таблица как на слайде: строки — ниши или каналы, столбцы — путь от касания
 * до оплаты. На телефоне листается вбок, первый столбец остаётся на месте.
 */
function FunnelTable({ head, rows, total }: { head: string; rows: FunnelRow[]; total?: FunnelRow }) {
  return (
    <div className="ftable">
      <div className="ftable__scroll">
        <table>
          <thead>
            <tr>
              <th className="ftable__name">{head}</th>
              <th>Касаний</th>
              <th>Открыли</th>
              <th>Промолчали</th>
              <th>Ответили «да»</th>
              <th>Ответили «нет»</th>
              <th>Позвали</th>
              <th>Провели</th>
              <th>Продаж</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
            {total && <Row row={total} strong />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, strong }: { row: FunnelRow; strong?: boolean }) {
  return (
    <tr className={strong ? 'ftable__total' : undefined}>
      <td className="ftable__name">{row.label}</td>
      <td>
        <b>{row.touched}</b>
      </td>
      <td>
        <b>{row.opened}</b>
        <i>{formatRate(row.openRate)}</i>
      </td>
      <td>
        <b>{row.silent}</b>
      </td>
      <td>
        <b>{row.answered}</b>
        <i>{formatRate(row.answerRate)}</i>
      </td>
      <td>
        <b>{row.declined}</b>
      </td>
      <td>
        <b>{row.callsSet}</b>
      </td>
      <td>
        <b>{row.callsDone}</b>
      </td>
      <td>
        <b>{row.won}</b>
        <i>{formatRate(row.winRate)}</i>
      </td>
    </tr>
  );
}

/** Сводка для куратора: та самая таблица, которую просят приложить к заданию */
function ExportBlock({ clients }: { clients: Client[] }) {
  const [done, setDone] = useState<string | null>(null);

  const say = (message: string) => {
    setDone(message);
    haptic('success');
    setTimeout(() => setDone(null), 3000);
  };

  return (
    <div className="backup">
      <p className="backup__text">
        Сводка таблицей: ниши и каналы, касания, открытия, ответы, созвоны и оплаты.
      </p>

      <div className="backup__buttons">
        <button
          type="button"
          className="backup__btn"
          onClick={() => {
            downloadCsv(summaryToCsv(clients), summaryFileName());
            say('Файл сохранён');
          }}
        >
          Скачать файл
        </button>
        <button
          type="button"
          className="backup__btn"
          onClick={() => {
            void copyToClipboard(summaryToCsv(clients)).then(
              () => say('Скопировано — вставь в таблицу или в чат'),
              () => say('Не получилось скопировать'),
            );
          }}
        >
          Скопировать
        </button>
      </div>

      {done && <div className="backup__done">{done}</div>}
    </div>
  );
}
