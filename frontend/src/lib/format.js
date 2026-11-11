/** Shared formatting helpers (dates, addresses, hashes, bytes, names). */

export const formatDate = (v) => (v ? new Date(v).toLocaleString() : '—');

export const formatDateShort = (v) =>
  v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

/** "3 min ago" style relative time. */
export function relativeTime(v) {
  if (!v) return '—';
  const then = new Date(v).getTime();
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return formatDateShort(v);
}

export const shortAddress = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '');

export const shortHash = (h) => (h && h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h || '');

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function initials(nameOrEmail = '') {
  const base = String(nameOrEmail).split('@')[0].replace(/[._-]+/g, ' ').trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
