import { useEffect, useState } from 'react';
import { haptic } from '../app/telegram';
import { STATUSES } from '../domain/dictionaries';
import { useClients } from '../store/clientsStore';

interface StatusSheetProps {
  /** название клиента — чтобы было видно, кому меняем статус */
  title: string;
  current: string;
  onSelect: (status: string) => void;
  onClose: () => void;
}

/** Нижняя шторка выбора статуса: открывается тапом по тегу в карточке списка. */
export function StatusSheet({ title, current, onSelect, onClose }: StatusSheetProps) {
  // пока шторка открыта, список под ней не прокручивается
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" />
        <div className="sheet__title">{title}</div>

        {STATUSES.map((status) => (
          <button
            key={status.id}
            type="button"
            className={`sheet__row${status.id === current ? ' sheet__row--on' : ''}`}
            onClick={() => {
              haptic('select');
              onSelect(status.id);
            }}
          >
            <span className={`sheet__dot sheet__dot--${status.tone}`} />
            {status.label}
            {status.id === current && <span className="sheet__check">✓</span>}
          </button>
        ))}

        <button type="button" className="sheet__cancel" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}

/**
 * Готовая шторка для экранов со списком: возвращает функцию открытия
 * и саму шторку, которую нужно отрисовать в конце экрана.
 */
export function useStatusSheet() {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const client = useClients((s) => (openFor ? s.byId(openFor) : undefined));
  const patch = useClients((s) => s.patch);

  const statusSheet = client ? (
    <StatusSheet
      title={client.name}
      current={client.status}
      onClose={() => setOpenFor(null)}
      onSelect={(status) => {
        void patch(client.id, { status });
        setOpenFor(null);
      }}
    />
  ) : null;

  return { openStatusSheet: setOpenFor, statusSheet };
}
