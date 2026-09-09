import { confirmDialog, haptic } from '../app/telegram';
import { formatDate, formatReminder } from '../domain/dates';
import { findContactType, findService, findSite, STATUSES } from '../domain/dictionaries';
import { Avatar } from '../components/Avatar';
import { ChipGroup } from '../components/Chips';
import { Section } from '../components/Fields';
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

  const askDelete = async () => {
    const ok = await confirmDialog(`Удалить «${client.name}»? Отменить это будет нельзя.`);
    if (!ok) return;
    haptic('warning');
    await remove(client.id);
    back();
  };

  return (
    <div className="screen screen--plain">
      <div className="details__top">
        <Avatar name={client.name} photo={photo} className="details__avatar" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="details__name">{client.name}</h1>
          {meta && <div className="details__meta">{meta}</div>}
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
