import type { ReactNode } from 'react';
import type { Tone } from '../domain/dictionaries';

interface TagProps {
  children: ReactNode;
  tone?: Tone;
}

export function Tag({ children, tone = 'neutral' }: TagProps) {
  return <span className={`tag tag--${tone}`}>{children}</span>;
}

export function TagsRow({ children }: { children: ReactNode }) {
  return <div className="tags-row">{children}</div>;
}
