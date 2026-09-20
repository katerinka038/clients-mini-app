import { confirmDialog, haptic } from '../app/telegram';
import { formatDate, formatReminder, todayISO } from '../domain/dates';
import {
  findChannel,
  findContactType,
  findService,
  findSite,
  findSource,
  STATUSES,
} from '../domain/dictionaries';
import { formatMoney } from '../domain/funnel';
import { Avatar } from '../components/Avatar';
import { ChipGroup } from '../components/Chips';
import { Section, Toggle } from '../components/Fields';
import { StarButton } from '../components/StarButton';
import { Tag, TagsRow } from '../components/Tag';
import { useClients } from '../store/clientsStore';
import { useNav } from '../store/navStore';

interface ClientDetailsScreenProps {
  id: string;
}

/** «12 марта» или «12 марта · завтра», если дата рядом */
function reminderLabel(iso: string): string {
  const date = formatDate(iso);
  const human = formatReminder(iso);
  return human === date ? date : `${date} · ${human}`;
}

export function ClientDetailsScreen({ id }: ClientDetailsScreenProps) {
  const client = useClients((s) => s.byId(id));
  const photo = useClients((s) => s.photos[id]);
  const patch = useClients((s) => s.patch);
  const remove = useClients((s) => s.remove);
  const toggleFavorite = useClients((s) => s.toggleFavorite);
  const push = useNav((s) => s.push);
  const back = useNav((s) => s.back);

  if (!client) {
    return (
      <div className="screen screen--plain">
        <div className="center-note">Клиент не найден.</div>
      </div>
    );
  }

  const site = findSite(client.site);
  const meta = [client.niche, client.city].filter(Boolean).join(' · ');
  const person = [client.decisionMaker, client.role].filter(Boolean).join(' · ');
  const today = todayISO();
  const pingedToday = client.pings.includes(today);

  const askDelete = async () => {
    const ok = await confirmDialog(`Удалить «${client.name}»? Отменить это будет нельзя.`);
    if (!ok) return;
    haptic('warning');
    await remove(client.id);
    back();
  };

  const togglePingToday = () => {
    haptic('tap');
    void patch(client.id, {
      pings: pingedToday
        ? client.pings.filter((p) => p !== today)
        : [...client.pings, today].sort(),
    });
  };

  return (
    <div className="screen screen--plain">
      <div className="details__top">
        <Avatar name={client.name} photo={photo} className="details__avatar" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="details__name">{client.name}</h1>
          {meta && <div className="details__meta">{meta}</div>}
          {person && <div className="details__meta">{person}</div>}
        </div>
        <StarButton inline size={24} active={client.favorite} onToggle={() => toggleFavorite(client.id)} />
      </div>

      <Section label="Статус">
        <ChipGroup
          wrap
          options={STATUSES}
          value={client.status}
          onSelect={(status) => void patch(client.id, { status })}
        />
      </Section>

      {client.hook && (
        <Section label="Зацепка">
          <div className="note-block">{client.hook}</div>
        </Section>
      )}

      <Section label="Как идём">
        <div className="panel">
          <div className="kv">
            <span className="kv__key">Первое сообщение</span>
            <span className="kv__val">
              {client.firstTouchAt ? reminderLabel(client.firstTouchAt) : 'ещё не писала'}
            </span>
          </div>
          <div className="kv">
            <span className="kv__key">Канал</span>
            <span className="kv__val">
              {client.channel ? findChannel(client.channel).label : '—'}
            </span>
          </div>
          <div className="kv">
            <span className="kv__key">Где нашла</span>
            <span className="kv__val">
              {client.source ? findSource(client.source).label : '—'}
            </span>
          </div>
          <div className="kv">
            <span className="kv__key">Напоминаний</span>
            <span className="kv__val">
              {client.pings.length > 0
                ? `${client.pings.length}, последнее ${formatReminder(client.pings[client.pings.length - 1])}`
                : 'пока не напоминала'}
            </span>
          </div>
          {client.amount > 0 && (
            <div className="kv">
              <span className="kv__key">Сумма</span>
              <span className="kv__val">{formatMoney(client.amount)}</span>
            </div>
          )}
        </div>

        <div className="stack-s" style={{ marginTop: 'var(--gap-m)' }}>
          <Toggle
            label="Прочитал сообщение"
            checked={client.opened}
            onChange={(opened) => void patch(client.id, { opened })}
          />
          <Toggle
            label="Напомнила о себе сегодня"
            hint="Смайлик, кружок или полезное сообщение"
            checked={pingedToday}
            onChange={togglePingToday}
          />
        </div>
      </Section>

      <Section label="Сайт">
        <TagsRow>
          {site.tag ? <Tag tone={site.tone}>{site.tag}</Tag> : <Tag>Про сайт не знаю</Tag>}
        </TagsRow>
      </Section>

      {client.contacts.length > 0 && (
        <Section label="Контакты">
          <div className="panel">
            {client.contacts.map((contact) => (
              <div className="kv" key={contact.id}>
                <span className="kv__key">
                  {findContactType(contact.type).label}
                  {contact.label ? ` · ${contact.label}` : ''}
                </span>
                <span className="kv__val">{contact.value || '—'}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {client.services.length > 0 && (
        <Section label="Что можно предложить">
          <TagsRow>
            {client.services.map((service) => (
              <Tag key={service} tone="accent">
                {findService(service).label}
              </Tag>
            ))}
          </TagsRow>
        </Section>
      )}

      {client.note.trim() && (
        <Section label="Заметка">
          <div className="note-block">{client.note}</div>
        </Section>
      )}

      <Section label="Вернуться к клиенту">
        <div className="panel">
          <div className="kv">
            <span className="kv__key">Напоминание</span>
            <span className="kv__val">
              {client.remindAt ? reminderLabel(client.remindAt) : 'не поставлено'}
            </span>
          </div>
          <div className="kv">
            <span className="kv__key">Добавлен</span>
            <span className="kv__val muted">{new Date(client.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </Section>

      <div className="stack-s" style={{ marginTop: 'var(--gap-xl)' }}>
        <button
          type="button"
          className="btn btn--dark"
          onClick={() => push({ name: 'form', id: client.id })}
        >
          Редактировать
        </button>
        <button type="button" className="btn btn--quiet-danger" onClick={() => void askDelete()}>
          Удалить клиента
        </button>
      </div>
    </div>
  );
}
