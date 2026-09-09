interface EmptyStateProps {
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn--dark empty__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
