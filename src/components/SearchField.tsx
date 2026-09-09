import { CloseIcon, SearchIcon } from './icons';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  return (
    <div className="search">
      <span className="search__icon">
        <SearchIcon />
      </span>
      <input
        className="search__input"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search__clear"
          aria-label="Очистить поиск"
          onClick={() => onChange('')}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
