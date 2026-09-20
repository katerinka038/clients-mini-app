interface EmptyStateProps {
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** второе, более спокойное действие — например «загрузить список» */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  title,
  text,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn--dark empty__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      {secondaryLabel && onSecondary && (
        <button type="button" className="btn btn--quiet empty__action" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
