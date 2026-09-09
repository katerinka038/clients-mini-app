import { memo } from 'react';
import { formatReminder } from '../domain/dates';
import { findSite, findStatus } from '../domain/dictionaries';
import type { Client } from '../domain/client';
import { Avatar } from './Avatar';
import { StarButton } from './StarButton';
import { Tag, TagsRow } from './Tag';

interface ClientCardProps {
  client: Client;
  photo?: string;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  /** если задан — тег статуса становится кнопкой смены статуса */
  onStatusTap?: (id: string) => void;
  /** показывать дату напоминания вместо заметки — для экрана «Напоминания» */
  showReminder?: boolean;
}

function ClientCardBase({
  client,
  photo,
  onOpen,
  onToggleFavorite,
  onStatusTap,
  showReminder,
}: ClientCardProps) {
  const status = findStatus(client.status);
  const site = findSite(client.site);
  const meta = [client.niche, client.city].filter(Boolean).join(' · ');

  return (
    <div className="card" role="button" tabIndex={0}
      onClick={() => onOpen(client.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(client.id);
        }
      }}
    >
      <Avatar name={client.name} photo={photo} />

      <div className="card__body">
        <div className="card__name">{client.name}</div>
        {meta && <div className="card__meta">{meta}</div>}

        <div className="card__tags">
          <TagsRow>
            {site.tag && <Tag tone={site.tone}>{site.tag}</Tag>}
            {onStatusTap ? (
              <button
                type="button"
                className={`tag tag--${status.tone} tag-button`}
                aria-label={`Статус: ${status.label}. Изменить`}
                onClick={(event) => {
                  event.stopPropagation();
                  onStatusTap(client.id);
                }}
              >
                {status.label}
              </button>
            ) : (
              <Tag tone={status.tone}>{status.label}</Tag>
            )}
          </TagsRow>
        </div>

        {showReminder && client.remindAt ? (
          <div className="card__date">Вернуться {formatReminder(client.remindAt)}</div>
        ) : (
          client.note.trim() && <div className="card__note">{client.note}</div>
        )}
      </div>

      <StarButton active={client.favorite} onToggle={() => onToggleFavorite(client.id)} />
    </div>
  );
}

export const ClientCard = memo(ClientCardBase);
