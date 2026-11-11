const MAP = {
  valid: { cls: 'ok', label: 'VALID' },
  issued: { cls: 'ok', label: 'ISSUED' },
  revoked: { cls: 'bad', label: 'REVOKED' },
  not_found: { cls: 'warn', label: 'NOT FOUND' },
  invalid_or_modified: { cls: 'warn', label: 'MODIFIED / INVALID' },
  pending: { cls: 'warn', label: 'PENDING ON-CHAIN' },
  authorized: { cls: 'ok', label: 'AUTHORIZED' },
  unauthorized: { cls: 'warn', label: 'NOT AUTHORIZED' },
};

export default function StatusBadge({ status }) {
  const m = MAP[status] || { cls: '', label: String(status || 'unknown').toUpperCase() };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}
