import { haptic } from '../app/telegram';
import { StarIcon } from './icons';

interface StarButtonProps {
  active: boolean;
  onToggle: () => void;
  /** true — кнопка стоит в потоке, а не в углу карточки */
  inline?: boolean;
  size?: number;
}

export function StarButton({ active, onToggle, inline = false, size = 20 }: StarButtonProps) {
  return (
    <button
      type="button"
      className={`star${active ? ' star--on' : ''}${inline ? ' star--static' : ''}`}
      aria-label={active ? 'Убрать из избранного' : 'В избранное'}
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation();
        haptic('select');
        onToggle();
      }}
    >
      <StarIcon size={size} filled={active} />
    </button>
  );
}
