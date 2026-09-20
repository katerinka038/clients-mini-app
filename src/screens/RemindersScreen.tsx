import { useMemo } from 'react';
import { bucketOf, todayISO, type ReminderBucket } from '../domain/dates';
import type { Client } from '../domain/client';
import { needsPing } from '../domain/funnel';
import { ClientCard } from '../components/ClientCard';
import { EmptyState } from '../components/EmptyState';
import { useStatusSheet } from '../components/StatusSheet';
import { useClients } from '../store/clientsStore';
import { useNav } from '../store/navStore';

const GROUPS: { id: ReminderBucket; title: string; overdue?: boolean }[] = [
  { id: 'today', title: 'Сегодня' },
  { id: 'overdue', title: 'Просрочено', overdue: true },
  { id: 'later', title: 'Позже' },
];

/** Сколько молчунов показываем сразу — дальше список становится бесполезным */
const SILENT_LIMIT = 30;

export function RemindersScreen() {
  const clients = useClients((s) => s.clients);
  const photos = useClients((s) => s.photos);
  const loaded = useClients((s) => s.loaded);
  const toggleFavorite = useClients((s) => s.toggleFavorite);
  const push = useNav((s) => s.push);
  const { openStatusSheet, statusSheet } = useStatusSheet();

  const groups = useMemo(() => {
    const today = todayISO();
    const result: Record<ReminderBucket, Client[]> = { today: [], overdue: [], later: [] };

    for (const client of clients) {
      if (!client.remindAt) continue;
      result[bucketOf(client.remindAt, today)].push(client);
    }

    // внутри групп — по дате: просроченные от самых старых, будущие от ближайших
    result.today.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    result.overdue.sort((a, b) => (a.remindAt! < b.remindAt! ? -1 : 1));
    result.later.sort((a, b) => (a.remindAt! < b.remindAt! ? -1 : 1));

    return result;
  }, [clients]);

  /**
   * Молчуны: написали, ответа нет и сегодня о себе ещё не напоминали.
   * Тех, у кого уже стоит дата на сегодня или раньше, не дублируем.
   */
  const silent = useMemo(() => {
    const today = todayISO();
    const planned = new Set(
      clients.filter((c) => c.remindAt && c.remindAt <= today).map((c) => c.id),
    );

    return clients
      .filter((c) => !planned.has(c.id) && needsPing(c, today))
      .sort((a, b) => {
        const lastA = a.pings[a.pings.length - 1] ?? a.firstTouchAt ?? '';
        const lastB = b.pings[b.pings.length - 1] ?? b.firstTouchAt ?? '';
        return lastA < lastB ? -1 : 1;
      });
  }, [clients]);

  const total = groups.today.length + groups.overdue.length + groups.later.length;

  return (
    <div className="screen">
      <header className="head">
        <div>
          <h1 className="head__title">Напоминания</h1>
          <div className="head__sub">Клиенты, к которым нужно вернуться</div>
        </div>
      </header>

      {total === 0 && silent.length === 0 && loaded && (
        <EmptyState
          title="Напоминаний нет"
          text="Поставь дату в карточке клиента — он появится здесь."
        />
      )}

      {GROUPS.map((group) => {
        const list = groups[group.id];
        if (list.length === 0) return null;
        return (
          <section key={group.id}>
            <h2 className={`group-title${group.overdue ? ' group-title--overdue' : ''}`}>
              {group.title}
              <span className="group-title__count">{list.length}</span>
            </h2>
            {list.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                photo={photos[client.id]}
                showReminder
                onOpen={(id) => push({ name: 'details', id })}
                onToggleFavorite={toggleFavorite}
                onStatusTap={openStatusSheet}
              />
            ))}
          </section>
        );
      })}

      {silent.length > 0 && (
        <section>
          <h2 className="group-title">
            Молчат
            <span className="group-title__count">{silent.length}</span>
          </h2>
          <p className="hint-text" style={{ marginTop: 0, marginBottom: 'var(--gap-m)' }}>
            Написала, ответа нет. Смайлик через несколько часов возвращает до&nbsp;трети таких
            диалогов.
          </p>
          {silent.slice(0, SILENT_LIMIT).map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              photo={photos[client.id]}
              onOpen={(id) => push({ name: 'details', id })}
              onToggleFavorite={toggleFavorite}
              onStatusTap={openStatusSheet}
            />
          ))}
        </section>
      )}

      {statusSheet}
    </div>
  );
}
