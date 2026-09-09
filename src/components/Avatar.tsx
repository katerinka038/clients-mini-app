/**
 * Круг клиента: фото, если оно загружено, иначе первая буква названия.
 * Цвет фона считается по названию, поэтому у клиента он всегда одинаковый,
 * а заполнять ничего не нужно.
 */

const PALETTE = [
  'var(--avatar-1)',
  'var(--avatar-2)',
  'var(--avatar-3)',
  'var(--avatar-4)',
  'var(--avatar-5)',
  'var(--avatar-6)',
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface AvatarProps {
  name: string;
  photo?: string;
  className?: string;
}

export function Avatar({ name, photo, className = 'card__avatar' }: AvatarProps) {
  if (photo) {
    return <img className={`${className} avatar-photo`} src={photo} alt="" aria-hidden="true" />;
  }

  const letter = name.trim().charAt(0).toUpperCase() || '·';
  const background = PALETTE[hash(name) % PALETTE.length];
  return (
    <div className={className} style={{ background }} aria-hidden="true">
      {letter}
    </div>
  );
}
