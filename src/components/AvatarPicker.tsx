import { useRef, useState } from 'react';
import { haptic } from '../app/telegram';
import { fileToAvatar } from '../domain/photo';
import { Avatar } from './Avatar';
import { CloseIcon, PlusIcon } from './icons';

interface AvatarPickerProps {
  name: string;
  photo?: string;
  onPick: (dataUrl: string) => void;
  onClear: () => void;
  onError: (message: string) => void;
}

export function AvatarPicker({ name, photo, onPick, onClear, onError }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onPick(await fileToAvatar(file));
      haptic('success');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не получилось добавить фото.');
      haptic('warning');
    } finally {
      setBusy(false);
      // сбрасываем, чтобы тот же файл можно было выбрать повторно
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="avatar-pick">
      <button
        type="button"
        className="avatar-pick__button"
        aria-label={photo ? 'Заменить фото' : 'Добавить фото'}
        onClick={() => inputRef.current?.click()}
      >
        <Avatar name={name} photo={photo} className="avatar-pick__circle" />
        <span className="avatar-pick__badge">
          {busy ? '…' : <PlusIcon size={14} />}
        </span>
      </button>

      {photo && (
        <button
          type="button"
          className="avatar-pick__clear"
          aria-label="Убрать фото"
          onClick={() => {
            haptic('tap');
            onClear();
          }}
        >
          <CloseIcon size={14} />
        </button>
      )}

      <input
        ref={inputRef}
        className="avatar-pick__input"
        type="file"
        accept="image/*"
        onChange={(event) => void choose(event.target.files?.[0])}
      />
    </div>
  );
}
