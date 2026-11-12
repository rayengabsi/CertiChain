/** Friendly empty state with an optional icon and call-to-action. */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty">
      {Icon ? (
        <span className="empty-icon">
          <Icon size={24} strokeWidth={1.9} />
        </span>
      ) : null}
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
      {action ? <div className="row tight">{action}</div> : null}
    </div>
  );
}
