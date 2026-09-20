import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="field">
      {label && <span className="field__label">{label}</span>}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  big?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { big, className = '', ...rest },
  ref,
) {
  return (
    <input ref={ref} className={`input${big ? ' input--big' : ''} ${className}`.trim()} {...rest} />
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

/** Текстовое поле, которое растёт вместе с текстом */
export function TextArea({ value, className = '', ...rest }: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} className={`textarea ${className}`.trim()} value={value} {...rest} />;
}

interface SegmentedProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="seg" role="group">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`seg__btn${value === option.id ? ' seg__btn--on' : ''}`}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Переключатель во всю строку: удобно попадать большим пальцем */
export function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      className={`toggle${checked ? ' toggle--on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </span>
      <span className="toggle__box" aria-hidden="true">
        ✓
      </span>
    </button>
  );
}

export function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="section">
      {label && <div className="section__label">{label}</div>}
      {children}
    </div>
  );
}
