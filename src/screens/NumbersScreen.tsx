import { useMemo, useState } from 'react';
import { haptic } from '../app/telegram';
import type { Client } from '../domain/client';
import { copyToClipboard, downloadCsv, summaryFileName, summaryToCsv } from '../domain/export';
import {
  DAILY_TARGET,
  adviceFor,
  formatMoney,
  formatRate,
  plural,
  TOUCH_FORMS,
  funnelByChannel,
  funnelByNiche,
  todayProgress,
  totalRow,
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

  const advice = adviceFor(total);

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
          <Section label="Всего">
            <div className="panel">
              <Steps row={total} />
              <div className={`advice advice--${advice.tone}`}>{advice.text}</div>
            </div>
          </Section>

          {niches.length > 0 && (
            <Section label="По нишам">
              <div className="stack-m">
                {niches.map((row) => (
                  <FunnelCard key={row.key} row={row} />
                ))}
              </div>
            </Section>
          )}

          {channels.length > 0 && (
            <Section label="По каналам">
              <div className="stack-m">
                {channels.map((row) => (
                  <FunnelCard key={row.key} row={row} />
                ))}
              </div>
            </Section>
          )}

          <Section label="Ориентиры">
            <div className="panel">
              <div className="kv">
                <span className="kv__key">Открыли</span>
                <span className="kv__val">35–50% от касаний</span>
              </div>
              <div className="kv">
                <span className="kv__key">Диалогов</span>
                <span className="kv__val">10–20 на сотню сообщений</span>
              </div>
              <div className="kv">
                <span className="kv__key">Созвонов</span>
                <span className="kv__val">3–5 из этих диалогов</span>
              </div>
              <div className="kv">
                <span className="kv__key">Оплат</span>
                <span className="kv__val">1–2 на сотню</span>
              </div>
            </div>
            <p className="hint-text">
              Меняем по&nbsp;одному: сначала канал, потом первые две строки, потом нишу. Иначе
              непонятно, что сработало.
            </p>
          </Section>

          <ExportBlock clients={clients} />
        </>
      )}
    </div>
  );
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

/** Воронка в строку: касания → открыли → ответили → созвоны → оплаты */
function Steps({ row }: { row: FunnelRow }) {
  return (
    <div className="steps">
      <Step value={row.touched} label="касаний" />
      <Step value={row.opened} label="открыли" note={formatRate(row.openRate)} />
      <Step value={row.answered} label="ответили" note={formatRate(row.answerRate)} />
      <Step value={row.callsDone} label="созвонов" note={row.callsSet > row.callsDone ? `+${row.callsSet - row.callsDone} назначено` : undefined} />
      <Step value={row.won} label="оплат" note={row.amount > 0 ? formatMoney(row.amount) : undefined} strong />
    </div>
  );
}

function Step({
  value,
  label,
  note,
  strong,
}: {
  value: number;
  label: string;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div className={`step${strong ? ' step--strong' : ''}`}>
      <div className="step__value">{value}</div>
      <div className="step__label">{label}</div>
      {note && <div className="step__note">{note}</div>}
    </div>
  );
}

function FunnelCard({ row }: { row: FunnelRow }) {
  const advice = adviceFor(row);

  return (
    <div className="funnel-card">
      <div className="funnel-card__head">
        <span className="funnel-card__name">{row.label}</span>
        <span className="funnel-card__touched">{row.touched} {plural(row.touched, TOUCH_FORMS)}</span>
      </div>

      <div className="funnel-card__cells">
        <Cell value={formatRate(row.openRate)} label="открыли" />
        <Cell value={String(row.answered)} label="ответили" />
        <Cell value={String(row.callsDone)} label="созвонов" />
        <Cell value={String(row.won)} label="оплат" />
      </div>

      <div className={`advice advice--${advice.tone}`}>{advice.text}</div>
    </div>
  );
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="funnel-cell">
      <span className="funnel-cell__value">{value}</span>
      <span className="funnel-cell__label">{label}</span>
    </div>
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
