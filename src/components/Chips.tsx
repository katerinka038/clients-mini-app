import { haptic } from '../app/telegram';

export interface ChipOption {
  id: string;
  label: string;
  count?: number;
}

interface ChipGroupProps {
  options: ChipOption[];
  /** для одиночного выбора */
  value?: string;
  /** для множественного выбора */
  values?: string[];
  onSelect?: (id: string) => void;
  onToggle?: (id: string) => void;
  /** переносить чипсы на новую строку вместо горизонтальной прокрутки */
  wrap?: boolean;
}

export function ChipGroup({ options, value, values, onSelect, onToggle, wrap }: ChipGroupProps) {
  const isOn = (id: string) => (values ? values.includes(id) : value === id);

  return (
    <div className={`chips${wrap ? ' chips--wrap' : ''}`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`chip${isOn(option.id) ? ' chip--on' : ''}`}
          aria-pressed={isOn(option.id)}
          onClick={() => {
            haptic('select');
            if (onToggle) onToggle(option.id);
            else onSelect?.(option.id);
          }}
        >
          {option.label}
          {typeof option.count === 'number' && <span className="chip__count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
