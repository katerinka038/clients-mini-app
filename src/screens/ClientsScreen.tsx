import { useEffect, useMemo, useState } from 'react';
import { haptic } from '../app/telegram';
import type { Client } from '../domain/client';
import { clientsToCsv, copyToClipboard, downloadCsv, exportFileName } from '../domain/export';
import { filterClients } from '../domain/search';
import { STATUSES } from '../domain/dictionaries';
import { ChipGroup, type ChipOption } from '../components/Chips';
import { ClientCard } from '../components/ClientCard';
import { EmptyState } from '../components/EmptyState';
import { PlusIcon } from '../components/icons';
import { SearchField } from '../components/SearchField';
import { useStatusSheet } from '../components/StatusSheet';
import { storageKind } from '../storage/clientsRepo';
import { useClients } from '../store/clientsStore';
import { useNav } from '../store/navStore';

/** Сколько карточек показывать сразу; остальные — по кнопке */
const PAGE_SIZE = 60;

export function ClientsScreen() {
  const clients = useClients((s) => s.clients);
  const photos = useClients((s) => s.photos);
  const loaded = useClients((s) => s.loaded);
  const error = useClients((s) => s.error);
  const query = useClients((s) => s.query);
  const statusFilter = useClients((s) => s.statusFilter);
  const setQuery = useClients((s) => s.setQuery);
  const setStatusFilter = useClients((s) => s.setStatusFilter);
  const toggleFavorite = useClients((s) => s.toggleFavorite);
  const push = useNav((s) => s.push);
  const { openStatusSheet, statusSheet } = useStatusSheet();

  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, statusFilter]);

  const filters: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const client of clients) {
      counts.set(client.status, (counts.get(client.status) ?? 0) + 1);
    }
    return [
      { id: 'all', label: 'Все', count: clients.length },
      ...STATUSES.map((status) => ({
        id: status.id,
        label: status.label,
        count: counts.get(status.id) ?? 0,
      })),
    ];
  }, [clients]);

  const visible = useMemo(
    () => filterClients(clients, { query, status: statusFilter }),
    [clients, query, statusFilter],
  );

  const openClient = (id: string) => push({ name: 'details', id });
  const openForm = () => {
    haptic('tap');
    push({ name: 'form' });
  };

  return (
    <div className="screen">
      <header className="head">
        <h1 className="head__title">Клиенты</h1>
        <button type="button" className="icon-round" aria-label="Добавить клиента" onClick={openForm}>
          <PlusIcon />
        </button>
      </header>

      {error && <div className="notice">{error}</div>}

      {storageKind === 'local' && (
        <div className="notice">
          Открыто вне Telegram: данные лежат только в этом браузере. В Telegram они сохраняются
          в&nbsp;облаке.
        </div>
      )}

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Поиск по названию, нише, городу"
      />

      <ChipGroup options={filters} value={statusFilter} onSelect={setStatusFilter} />

      <div style={{ marginTop: 'var(--gap-l)' }}>
        {visible.slice(0, limit).map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            photo={photos[client.id]}
            onOpen={openClient}
            onToggleFavorite={toggleFavorite}
            onStatusTap={openStatusSheet}
          />
        ))}

        {visible.length > limit && (
          <button type="button" className="more-btn" onClick={() => setLimit(limit + PAGE_SIZE)}>
            Показать ещё {Math.min(PAGE_SIZE, visible.length - limit)}
          </button>
        )}

        {visible.length === 0 && loaded && clients.length > 0 && (
          <EmptyState title="Никого не нашла" text="Попробуй другое слово или сбрось фильтр." />
        )}

        {clients.length === 0 && loaded && (
          <EmptyState
            title="Пока пусто"
            text="Добавь первого клиента — хватит одного названия, остальное можно дописать потом."
            actionLabel="Добавить клиента"
            onAction={openForm}
          />
        )}

        {!loaded && clients.length === 0 && <div className="center-note">Загружаю…</div>}
      </div>

      {clients.length > 0 && <BackupBlock clients={clients} />}

      {statusSheet}
    </div>
  );
}

/** Резервная копия: таблица со всеми клиентами файлом или текстом */
function BackupBlock({ clients }: { clients: Client[] }) {
  const [done, setDone] = useState<string | null>(null);

  const say = (message: string) => {
    setDone(message);
    haptic('success');
    setTimeout(() => setDone(null), 3000);
  };

  return (
    <div className="backup">
      <p className="backup__text">
        Копия списка на&nbsp;всякий случай — таблица для&nbsp;Excel. Фото в&nbsp;неё не&nbsp;входят.
      </p>

      <div className="backup__buttons">
        <button
          type="button"
          className="backup__btn"
          onClick={() => {
            downloadCsv(clientsToCsv(clients), exportFileName());
            say('Файл сохранён');
          }}
        >
          Скачать файл
        </button>
        <button
          type="button"
          className="backup__btn"
          onClick={() => {
            void copyToClipboard(clientsToCsv(clients)).then(
              () => say('Скопировано — вставь себе в «Избранное»'),
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
